import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import * as crypto from 'crypto';
import type {
  ReservationRecord,
  ReservationWithTransaction,
} from './types/reservation.types';

type DriverVehicleRecord = Awaited<
  ReturnType<PrismaService['driverVehicle']['findFirst']>
>;

type HostReservationRecord = Prisma.ReservationGetPayload<{
  include: {
    parkingSpace: {
      include: {
        parkingLocation: true;
      };
    };
    driver: {
      include: {
        user: {
          select: {
            firstName: true;
            lastName: true;
            phoneNumber: true;
            profilePicture: true;
          };
        };
        vehicles: true;
      };
    };
  };
}>;

// Helper to safely extract nullable Prisma fields that ESLint can't resolve
function toNullable<T>(value: unknown): T | null {
  return (value ?? null) as T | null;
}

@Injectable()
export class ReservationsService implements OnModuleInit, OnModuleDestroy {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  private readonly HOST_APPROVAL_WINDOW_MS = 5 * 60 * 1000;
  private readonly DRIVER_ARRIVAL_WINDOW_MS = 60 * 60 * 1000;
  private readonly PLATFORM_COMMISSION_RATE = new Decimal(0.1);
  private readonly OCCUPANCY_ACTIVE_STATUSES = ['CONFIRMED', 'ACTIVE'] as const;
  private timeoutSweepInterval: NodeJS.Timeout | null = null;

  private async syncLocationAvailableSlotsBySpaceId(
    tx: Prisma.TransactionClient,
    parkingSpaceId: string,
  ) {
    const space = await tx.parkingSpace.findUnique({
      where: { id: parkingSpaceId },
      select: {
        parkingLocationId: true,
      },
    });

    if (!space) {
      return;
    }

    const availableCount = await tx.parkingSpace.count({
      where: {
        parkingLocationId: space.parkingLocationId,
        status: 'AVAILABLE',
      },
    });

    await tx.parkingLocation.update({
      where: { id: space.parkingLocationId },
      data: { availableSlots: availableCount },
    });
  }

  /** Emit real-time slot count to all clients viewing this location (called after transaction commits) */
  private async emitSlotUpdate(parkingSpaceId: string): Promise<void> {
    try {
      const space = await this.prisma.parkingSpace.findUnique({
        where: { id: parkingSpaceId },
        select: {
          status: true,
          parkingLocationId: true,
          parkingLocation: { select: { availableSlots: true } },
        },
      });
      if (space) {
        this.notificationsGateway.sendSlotUpdate(
          space.parkingLocationId,
          space.parkingLocation.availableSlots ?? 0,
          parkingSpaceId,
          space.status,
        );
      }
    } catch {
      // Non-critical — never block main flow
    }
  }

  /** Emit real-time wallet balance to a user (called after transaction commits) */
  private async emitBalanceUpdate(userId: string): Promise<void> {
    try {
      const wallet = await this.prisma.wallet.findUnique({
        where: { userId },
        select: { balance: true },
      });
      if (wallet) {
        this.notificationsGateway.sendBalanceUpdate(
          userId,
          wallet.balance.toFixed(2),
        );
      }
    } catch {
      // Non-critical — never block main flow
    }
  }

  onModuleInit() {
    this.timeoutSweepInterval = setInterval(() => {
      void this.processReservationTimeouts().catch((error: unknown) => {
        console.error('Failed to process reservation timeouts:', error);
      });
    }, 30 * 1000);
  }

  onModuleDestroy() {
    if (this.timeoutSweepInterval) {
      clearInterval(this.timeoutSweepInterval);
      this.timeoutSweepInterval = null;
    }
  }

  /**
   * Process timed-out reservations:
   * - PENDING: cancel + refund escrow
   * - CONFIRMED: mark expired (no refund)
   */
  private async processReservationTimeouts() {
    const now = new Date();

    const timedOutReservations = await this.prisma.reservation.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED'] },
        arrivalDeadline: { lt: now },
      },
      include: {
        driver: { select: { userId: true } },
        parkingSpace: {
          include: {
            parkingLocation: {
              include: { host: true },
            },
          },
        },
      },
    });

    for (const timedOut of timedOutReservations) {
      await this.prisma.$transaction(async (tx) => {
        const reservation = await tx.reservation.findUnique({
          where: { id: timedOut.id },
          include: {
            driver: {
              select: { userId: true },
            },
          },
        });

        if (!reservation) {
          return;
        }

        if (reservation.status === 'PENDING') {
          if (reservation.escrowAmount) {
            const driverWallet = await tx.wallet.findUnique({
              where: { userId: reservation.driver.userId },
            });

            if (driverWallet) {
              const refundAmount = new Decimal(
                String(reservation.escrowAmount),
              );

              await tx.walletTransaction.create({
                data: {
                  walletId: driverWallet.id,
                  type: 'CREDIT',
                  source: 'REFUND',
                  amount: refundAmount,
                  referenceId: reservation.id,
                  balanceBefore: driverWallet.balance,
                  balanceAfter: new Decimal(driverWallet.balance).add(
                    refundAmount,
                  ),
                },
              });

              await tx.wallet.update({
                where: { id: driverWallet.id },
                data: {
                  balance: { increment: refundAmount.toNumber() },
                },
              });
            }
          }

          await tx.parkingSpace.update({
            where: { id: reservation.parkingSpaceId },
            data: { status: 'AVAILABLE' },
          });
          await this.syncLocationAvailableSlotsBySpaceId(
            tx,
            reservation.parkingSpaceId,
          );

          await tx.reservation.update({
            where: { id: reservation.id },
            data: {
              status: 'CANCELLED',
              cancelledBy: 'SYSTEM',
              escrowAmount: 0,
            },
          });

          return;
        }

        if (reservation.status === 'CONFIRMED') {
          await tx.parkingSpace.update({
            where: { id: reservation.parkingSpaceId },
            data: { status: 'AVAILABLE' },
          });
          await this.syncLocationAvailableSlotsBySpaceId(
            tx,
            reservation.parkingSpaceId,
          );

          await tx.reservation.update({
            where: { id: reservation.id },
            data: {
              status: 'EXPIRED',
              escrowAmount: 0,
            },
          });

          // Notify driver and host of no-show expiry (outside transaction)
          const locationTitle = timedOut.parkingSpace.parkingLocation.title;
          const hostUserId = timedOut.parkingSpace.parkingLocation.host.userId;
          const driverUserId = timedOut.driver.userId;

          this.notificationsService
            .send({
              userId: driverUserId,
              title: 'Booking Expired — No Arrival',
              message: `Your booking at ${locationTitle} has been cancelled because you did not arrive within the 1-hour window. Your escrow has been forfeited.`,
              type: 'BOOKING_CANCELLED',
              data: { reservationId: timedOut.id, screen: 'reservation-qr' },
            })
            .catch(() => {});

          this.notificationsService
            .send({
              userId: hostUserId,
              title: 'Driver Did Not Arrive',
              message: `A driver did not arrive at ${locationTitle} within the 1-hour window. The booking has been automatically cancelled and the slot is now available.`,
              type: 'BOOKING_CANCELLED',
              data: {
                reservationId: timedOut.id,
                screen: 'host-reservation-detail',
              },
            })
            .catch(() => {});
        }
      });

      // Push real-time updates after transaction commits
      void this.emitSlotUpdate(timedOut.parkingSpaceId);
      if (timedOut.status === 'PENDING') {
        void this.emitBalanceUpdate(timedOut.driver.userId);
      }
    }
  }

  /**
   * Generate a unique QR code for the reservation
   */
  private generateQRCode(reservationId: string): {
    qrCode: string;
    qrCodeSecret: string;
  } {
    const qrCodeSecret = crypto.randomBytes(32).toString('hex');
    const qrCode = `PKL-${reservationId.slice(0, 8)}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    return { qrCode, qrCodeSecret };
  }

  /**
   * Check if a parking location is currently open based on openTime/closeTime
   */
  private isLocationOpen(location: {
    is24Hours: boolean;
    openTime: string | null;
    closeTime: string | null;
  }): boolean {
    if (location.is24Hours) return true;
    if (!location.openTime || !location.closeTime) return true;

    const now = new Date();
    const [openH, openM] = location.openTime.split(':').map(Number);
    const [closeH, closeM] = location.closeTime.split(':').map(Number);

    const currentMinutes = this.getCurrentMinutesInTimezone('Asia/Manila', now);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    if (closeMinutes > openMinutes) {
      return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    }
    // Overnight hours (e.g. 22:00 - 06:00)
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }

  private getCurrentMinutesInTimezone(timeZone: string, date = new Date()) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(date);

      const hour = Number(parts.find((part) => part.type === 'hour')?.value);
      const minute = Number(
        parts.find((part) => part.type === 'minute')?.value,
      );

      if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
        return date.getHours() * 60 + date.getMinutes();
      }

      return hour * 60 + minute;
    } catch {
      return date.getHours() * 60 + date.getMinutes();
    }
  }

  /**
   * Get first-hour fee for a parking space
   */
  async getFirstHourFee(parkingSpaceId: string) {
    const parkingSpace = await this.prisma.parkingSpace.findUnique({
      where: { id: parkingSpaceId },
      include: { parkingLocation: true },
    });

    if (!parkingSpace) {
      throw new NotFoundException('Parking space not found');
    }

    const pricePerHour = new Decimal(
      parkingSpace.parkingLocation.basePricePerHour,
    );

    return {
      parkingSpaceId,
      locationTitle: parkingSpace.parkingLocation.title,
      slotNumber: parkingSpace.slotNumber,
      slotName: parkingSpace.name,
      description: parkingSpace.description,
      pricePerHour: pricePerHour.toNumber(),
      firstHourFee: pricePerHour.toNumber(),
      isOpen: this.isLocationOpen(parkingSpace.parkingLocation),
      openTime: parkingSpace.parkingLocation.openTime,
      closeTime: parkingSpace.parkingLocation.closeTime,
      is24Hours: parkingSpace.parkingLocation.is24Hours,
    };
  }

  /**
   * Create a new reservation — driver pays first hour upfront, then waits for host approval
   */
  async createReservation(userId: string, dto: CreateReservationDto) {
    await this.processReservationTimeouts();

    const driverRole = await this.prisma.userRole.findFirst({
      where: {
        userId,
        role: {
          name: 'DRIVER',
        },
      },
      select: {
        status: true,
      },
    });

    if (driverRole?.status === 'SUSPENDED') {
      throw new ForbiddenException(
        'Your reservation activity is currently suspended. Please contact support.',
      );
    }

    // Get the driver record
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
    });

    if (!driver) {
      throw new BadRequestException(
        'You must be registered as a driver to make reservations',
      );
    }

    // If vehicleId is provided, verify it belongs to this driver
    let selectedVehicle: DriverVehicleRecord = null;
    if (dto.vehicleId) {
      selectedVehicle = await this.prisma.driverVehicle.findFirst({
        where: {
          id: dto.vehicleId,
          driverId: driver.id,
          isActive: true,
          deletedAt: null,
        },
      });
      if (!selectedVehicle) {
        throw new BadRequestException(
          'Selected vehicle not found or is not active.',
        );
      }
      if ((selectedVehicle as any).verificationStatus !== 'APPROVED') {
        throw new BadRequestException(
          'Your vehicle is pending verification. Please wait for admin approval before booking.',
        );
      }
    } else {
      // Fall back to most recent approved active vehicle
      selectedVehicle = await this.prisma.driverVehicle.findFirst({
        where: {
          driverId: driver.id,
          isActive: true,
          deletedAt: null,
          verificationStatus: 'APPROVED',
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!selectedVehicle) {
      throw new BadRequestException(
        'Please add at least one approved vehicle before booking.',
      );
    }

    // Get parking space and location
    const parkingSpace = await this.prisma.parkingSpace.findUnique({
      where: { id: dto.parkingSpaceId },
      include: {
        parkingLocation: {
          include: {
            host: true,
            images: true,
          },
        },
      },
    });

    if (!parkingSpace) {
      throw new NotFoundException('Parking space not found');
    }

    if (parkingSpace.status !== 'AVAILABLE') {
      throw new BadRequestException('Parking space is not available');
    }

    if (parkingSpace.parkingLocation.status !== 'APPROVED') {
      throw new BadRequestException('Parking location is not approved');
    }

    // Check vehicle type compatibility with location
    const acceptedVehicles =
      parkingSpace.parkingLocation.acceptedVehicles ?? [];
    if (
      acceptedVehicles.length > 0 &&
      selectedVehicle.vehicleType &&
      !acceptedVehicles.includes(selectedVehicle.vehicleType)
    ) {
      const accepted = acceptedVehicles.join(', ');
      throw new BadRequestException(
        `This location only accepts ${accepted}. Your vehicle type (${selectedVehicle.vehicleType}) is not compatible.`,
      );
    }

    // Check if location is currently open
    if (!this.isLocationOpen(parkingSpace.parkingLocation)) {
      throw new BadRequestException(
        `This location is currently closed. Operating hours: ${parkingSpace.parkingLocation.openTime} - ${parkingSpace.parkingLocation.closeTime}`,
      );
    }

    // Check for existing active or unpaid reservation by this driver
    const existingReservation = await this.prisma.reservation.findFirst({
      where: {
        driverId: driver.id,
        status: { in: ['PENDING', 'CONFIRMED', 'ACTIVE', 'PAYMENT_PENDING'] },
      },
    });

    if (existingReservation) {
      if (existingReservation.status === 'PAYMENT_PENDING') {
        throw new BadRequestException(
          'You have an outstanding balance from a previous session. Please top up your wallet and settle your due before making a new booking.',
        );
      }
      throw new BadRequestException(
        'You already have a pending or active reservation. Please complete or cancel it first.',
      );
    }

    // Calculate first hour fee
    const pricePerHour = new Decimal(
      parkingSpace.parkingLocation.basePricePerHour,
    );
    const firstHourFee = pricePerHour;

    // Check wallet balance
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new BadRequestException(
        'Wallet not found. Please top up your wallet first.',
      );
    }

    if (new Decimal(wallet.balance).lt(firstHourFee)) {
      throw new BadRequestException(
        `Insufficient balance. Required: ₱${firstHourFee.toFixed(2)}, Available: ₱${new Decimal(wallet.balance).toFixed(2)}`,
      );
    }

    // Generate QR code
    const { qrCode, qrCodeSecret } = this.generateQRCode(crypto.randomUUID());

    // Set host approval deadline — 5 minutes from now
    const now = new Date();
    const approvalDeadline = new Date(
      now.getTime() + this.HOST_APPROVAL_WINDOW_MS,
    );

    // Create reservation with wallet debit in a transaction
    type CreatedReservation = Prisma.ReservationGetPayload<{
      include: {
        parkingSpace: {
          include: {
            parkingLocation: {
              include: {
                images: true;
              };
            };
          };
        };
      };
    }>;

    const result = (await this.prisma.$transaction(async (tx) => {
      // Debit wallet for first hour
      const balanceBefore = wallet.balance;
      const balanceAfter = new Decimal(balanceBefore).sub(firstHourFee);

      const walletTransaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT',
          source: 'RESERVATION_PAYMENT',
          amount: firstHourFee,
          balanceBefore,
          balanceAfter,
        },
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: firstHourFee.toNumber() },
        },
      });

      // Mark parking space as occupied (reserved)
      await tx.parkingSpace.update({
        where: { id: dto.parkingSpaceId },
        data: { status: 'OCCUPIED' },
      });
      await this.syncLocationAvailableSlotsBySpaceId(tx, dto.parkingSpaceId);

      // Create reservation
      const reservation = await tx.reservation.create({
        data: {
          driverId: driver.id,
          parkingSpaceId: dto.parkingSpaceId,
          vehicleId: selectedVehicle.id,
          status: 'PENDING',
          qrCode,
          qrCodeSecret,
          totalAmount: firstHourFee,
          escrowAmount: firstHourFee,
          arrivalDeadline: approvalDeadline,
          walletTransactionId: walletTransaction.id,
        },
        include: {
          parkingSpace: {
            include: {
              parkingLocation: {
                include: {
                  images: true,
                },
              },
            },
          },
        },
      });

      return reservation;
    })) as CreatedReservation;

    // Push real-time updates after transaction commits
    void this.emitSlotUpdate(dto.parkingSpaceId);
    void this.emitBalanceUpdate(userId);

    const space = result.parkingSpace;
    const location = space.parkingLocation;

    // Notify host of pending booking
    const [driverUser, hostRecord] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      }),
      this.prisma.host.findUnique({
        where: { id: location.hostId },
        select: { userId: true },
      }),
    ]);
    const driverName =
      [driverUser?.firstName, driverUser?.lastName].filter(Boolean).join(' ') ||
      'A driver';
    if (hostRecord) {
      this.notificationsService
        .notifyBookingPending(
          hostRecord.userId,
          result.id,
          location.title,
          driverName,
        )
        .catch(() => {});
    }

    return {
      id: result.id,
      qrCode: result.qrCode,
      status: result.status,
      totalAmount: result.totalAmount,
      escrowAmount: toNullable(result.escrowAmount),
      arrivalDeadline: result.arrivalDeadline,
      parkingSpace: {
        id: space.id,
        slotNumber: space.slotNumber,
        name: space.name,
        description: space.description,
      },
      parkingLocation: {
        id: location.id,
        title: location.title,
        address: location.address,
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        images: location.images,
      },
      message:
        'Booking request submitted. Waiting for host approval (5-minute window).',
    };
  }

  /**
   * Get driver's reservations
   */
  async getDriverReservations(userId: string, status?: string) {
    await this.processReservationTimeouts();

    const driver = await this.prisma.driver.findUnique({
      where: { userId },
    });

    if (!driver) {
      return [];
    }

    const whereClause: Prisma.ReservationWhereInput = { driverId: driver.id };
    if (status) {
      const filterMap: Record<string, Prisma.ReservationWhereInput['status']> =
        {
          Upcoming: { in: ['PENDING', 'CONFIRMED'] },
          Active: { equals: 'ACTIVE' },
          Past: { in: ['COMPLETED', 'CANCELLED', 'EXPIRED'] },
        };
      const mapped = filterMap[status];
      if (mapped) {
        whereClause.status = mapped;
      } else {
        whereClause.status = status as Prisma.EnumReservationStatusFilter;
      }
    }

    const reservations = await this.prisma.reservation.findMany({
      where: whereClause,
      include: {
        parkingSpace: {
          include: {
            parkingLocation: {
              include: {
                images: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reservations.map((r) => ({
      id: r.id,
      qrCode: r.qrCode,
      status: r.status,
      arrivalDeadline: r.arrivalDeadline,
      sessionStartedAt: toNullable<Date>(r.sessionStartedAt),
      sessionEndedAt: toNullable<Date>(r.sessionEndedAt),
      totalAmount: r.totalAmount,
      escrowAmount: toNullable(r.escrowAmount),
      finalAmount: toNullable(r.finalAmount),
      commissionRate: r.commissionRate,
      platformFee: toNullable(r.platformFee),
      hostPayoutAmount:
        r.hostPayoutAmount != null ? Number(r.hostPayoutAmount) : null,
      overtimeAmount: toNullable(r.overtimeAmount),
      remainingDue:
        (r as any).remainingDue != null
          ? Number((r as any).remainingDue)
          : null,
      createdAt: r.createdAt,
      parkingSpace: {
        id: r.parkingSpace.id,
        slotNumber: r.parkingSpace.slotNumber,
        name: r.parkingSpace.name,
        description: r.parkingSpace.description,
      },
      parkingLocation: {
        id: r.parkingSpace.parkingLocation.id,
        title: r.parkingSpace.parkingLocation.title,
        address: r.parkingSpace.parkingLocation.address,
        latitude: Number(r.parkingSpace.parkingLocation.latitude),
        longitude: Number(r.parkingSpace.parkingLocation.longitude),
        image: r.parkingSpace.parkingLocation.images[0]?.imageUrl || null,
      },
    }));
  }

  /**
   * Get a single reservation by ID
   */
  async getReservation(userId: string, reservationId: string) {
    await this.processReservationTimeouts();

    const driver = await this.prisma.driver.findUnique({
      where: { userId },
    });

    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        parkingSpace: {
          include: {
            parkingLocation: {
              include: {
                images: true,
                host: {
                  include: {
                    user: {
                      select: {
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                        sex: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        driver: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    // Allow the driver who owns the reservation
    const isOwnerDriver = driver && reservation.driverId === driver.id;
    // Allow the host who owns the parking location
    const hostLocationUserId =
      reservation.parkingSpace.parkingLocation.host?.userId;
    const isOwnerHost = hostLocationUserId === userId;

    if (!isOwnerDriver && !isOwnerHost) {
      throw new ForbiddenException(
        'You do not have access to this reservation',
      );
    }

    const space = reservation.parkingSpace;
    const location = space.parkingLocation;

    return {
      id: reservation.id,
      qrCode: reservation.qrCode,
      status: reservation.status,
      arrivalDeadline: reservation.arrivalDeadline,
      sessionStartedAt: toNullable<Date>(reservation.sessionStartedAt),
      sessionEndedAt: toNullable<Date>(reservation.sessionEndedAt),
      totalAmount: reservation.totalAmount,
      escrowAmount: toNullable(reservation.escrowAmount),
      finalAmount: toNullable(reservation.finalAmount),
      commissionRate: reservation.commissionRate,
      platformFee: toNullable(reservation.platformFee),
      hostPayoutAmount:
        reservation.hostPayoutAmount != null
          ? Number(reservation.hostPayoutAmount)
          : null,
      overtimeAmount: toNullable(reservation.overtimeAmount),
      remainingDue:
        (reservation as any).remainingDue != null
          ? Number((reservation as any).remainingDue)
          : null,
      createdAt: reservation.createdAt,
      parkingSpace: {
        id: space.id,
        slotNumber: space.slotNumber,
        name: space.name,
        description: space.description,
      },
      parkingLocation: {
        id: location.id,
        title: location.title,
        address: location.address,
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        images: location.images,
        basePricePerHour: location.basePricePerHour,
      },
      host: location.host
        ? {
            name: `${location.host.user.firstName || ''} ${location.host.user.lastName || ''}`.trim(),
            phone: location.host.user.phoneNumber,
            sex: (location.host.user as any).sex ?? null,
          }
        : null,
    };
  }

  /**
   * Admin: Trace a reservation to its linked space/location and occupancy expectations.
   */
  async getReservationTraceForAdmin(reservationId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        driver: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        parkingSpace: {
          include: {
            parkingLocation: {
              include: {
                host: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    const reservationStatus = reservation.status;
    const isStatusOccupancyActive = this.OCCUPANCY_ACTIVE_STATUSES.includes(
      reservationStatus as (typeof this.OCCUPANCY_ACTIVE_STATUSES)[number],
    );
    const spaceMarkedOccupied = reservation.parkingSpace.status === 'OCCUPIED';

    return {
      reservation: {
        id: reservation.id,
        status: reservation.status,
        createdAt: reservation.createdAt,
        arrivalDeadline: reservation.arrivalDeadline,
        sessionStartedAt: toNullable<Date>(reservation.sessionStartedAt),
        sessionEndedAt: toNullable<Date>(reservation.sessionEndedAt),
      },
      driver: {
        id: reservation.driver.user.id,
        email: reservation.driver.user.email,
        name:
          [reservation.driver.user.firstName, reservation.driver.user.lastName]
            .filter(Boolean)
            .join(' ') || null,
      },
      space: {
        id: reservation.parkingSpace.id,
        status: reservation.parkingSpace.status,
        isActive: reservation.parkingSpace.isActive,
        slotNumber: reservation.parkingSpace.slotNumber,
        name: reservation.parkingSpace.name,
        levelNumber: reservation.parkingSpace.levelNumber,
      },
      location: {
        id: reservation.parkingSpace.parkingLocation.id,
        title: reservation.parkingSpace.parkingLocation.title,
        status: reservation.parkingSpace.parkingLocation.status,
        host: {
          userId: reservation.parkingSpace.parkingLocation.host.user.id,
          email: reservation.parkingSpace.parkingLocation.host.user.email,
          name:
            [
              reservation.parkingSpace.parkingLocation.host.user.firstName,
              reservation.parkingSpace.parkingLocation.host.user.lastName,
            ]
              .filter(Boolean)
              .join(' ') || null,
        },
      },
      occupancyDiagnostics: {
        activeStatusesForListings: this.OCCUPANCY_ACTIVE_STATUSES,
        isStatusOccupancyActive,
        spaceMarkedOccupied,
        shouldAppearOccupiedInListings:
          isStatusOccupancyActive || spaceMarkedOccupied,
        mismatch:
          isStatusOccupancyActive && !spaceMarkedOccupied
            ? 'Reservation is active by status but space is not marked OCCUPIED.'
            : null,
      },
    };
  }

  /**
   * Host: Approve reservation request (within 5-minute approval window)
   */
  async approveReservation(hostUserId: string, reservationId: string) {
    await this.processReservationTimeouts();

    const host = await this.prisma.host.findUnique({
      where: { userId: hostUserId },
    });

    if (!host) {
      throw new ForbiddenException('Only hosts can approve reservations');
    }

    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        driver: true,
        parkingSpace: {
          include: {
            parkingLocation: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.parkingSpace.parkingLocation.hostId !== host.id) {
      throw new ForbiddenException(
        'This reservation is not for your parking location',
      );
    }

    if (reservation.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot approve reservation with status: ${reservation.status}`,
      );
    }

    const now = new Date();
    if (now > reservation.arrivalDeadline) {
      await this.processReservationTimeouts();
      throw new BadRequestException(
        'Approval window has expired and the reservation was cancelled.',
      );
    }

    const arrivalDeadline = new Date(
      now.getTime() + this.DRIVER_ARRIVAL_WINDOW_MS,
    );

    const updated = await this.prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        status: 'CONFIRMED',
        arrivalDeadline,
      },
    });

    // Notify the driver that their booking was approved
    this.notificationsService
      .notifyBookingApproved(
        reservation.driver.userId,
        reservation.id,
        reservation.parkingSpace.parkingLocation.title,
      )
      .catch((err) =>
        console.error('Failed to send booking approved notification:', err),
      );

    return {
      success: true,
      message: 'Reservation approved. Driver now has 60 minutes to arrive.',
      reservation: {
        id: updated.id,
        status: updated.status,
        arrivalDeadline: updated.arrivalDeadline,
      },
    };
  }

  /**
   * Host: Reject reservation request (within 5-minute approval window)
   */
  async rejectReservation(hostUserId: string, reservationId: string) {
    await this.processReservationTimeouts();

    const host = await this.prisma.host.findUnique({
      where: { userId: hostUserId },
    });

    if (!host) {
      throw new ForbiddenException('Only hosts can reject reservations');
    }

    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        parkingSpace: {
          include: {
            parkingLocation: true,
          },
        },
        driver: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.parkingSpace.parkingLocation.hostId !== host.id) {
      throw new ForbiddenException(
        'This reservation is not for your parking location',
      );
    }

    if (reservation.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot reject reservation with status: ${reservation.status}`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (reservation.escrowAmount) {
        const driverWallet = await tx.wallet.findUnique({
          where: { userId: reservation.driver.userId },
        });

        if (driverWallet) {
          const refundAmount = new Decimal(String(reservation.escrowAmount));

          await tx.walletTransaction.create({
            data: {
              walletId: driverWallet.id,
              type: 'CREDIT',
              source: 'REFUND',
              amount: refundAmount,
              referenceId: reservation.id,
              balanceBefore: driverWallet.balance,
              balanceAfter: new Decimal(driverWallet.balance).add(refundAmount),
            },
          });

          await tx.wallet.update({
            where: { id: driverWallet.id },
            data: {
              balance: { increment: refundAmount.toNumber() },
            },
          });
        }
      }

      await tx.parkingSpace.update({
        where: { id: reservation.parkingSpaceId },
        data: { status: 'AVAILABLE' },
      });
      await this.syncLocationAvailableSlotsBySpaceId(
        tx,
        reservation.parkingSpaceId,
      );

      return tx.reservation.update({
        where: { id: reservation.id },
        data: {
          status: 'CANCELLED',
          cancelledBy: 'HOST',
          escrowAmount: 0,
        },
      });
    });

    // Push real-time updates after transaction commits
    void this.emitSlotUpdate(reservation.parkingSpaceId);
    void this.emitBalanceUpdate(reservation.driver.userId);

    // Notify driver that host rejected/cancelled their booking
    this.notificationsService
      .notifyBookingCancelled(
        reservation.driver.userId,
        reservationId,
        reservation.parkingSpace.parkingLocation.title,
        'host',
      )
      .catch(() => {});

    return {
      success: true,
      message: 'Reservation rejected. Driver has been refunded.',
      reservation: {
        id: updated.id,
        status: updated.status,
      },
    };
  }

  /**
   * Valet/Host: Scan QR code for entry — starts the parking session
   */
  async verifyEntryQR(hostUserId: string, qrCode: string, force = false) {
    await this.processReservationTimeouts();

    const host = await this.prisma.host.findUnique({
      where: { userId: hostUserId },
    });

    if (!host) {
      throw new ForbiddenException('Only hosts can scan QR codes');
    }

    const reservation = await this.prisma.reservation.findFirst({
      where: { qrCode },
      include: {
        parkingSpace: {
          include: {
            parkingLocation: true,
          },
        },
        driver: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
            vehicles: {
              where: { isActive: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!reservation) {
      throw new BadRequestException('Invalid QR code');
    }

    // Verify this is the host's parking location
    if (reservation.parkingSpace.parkingLocation.hostId !== host.id) {
      throw new ForbiddenException(
        'This reservation is not for your parking location',
      );
    }

    // Check reservation status
    if (reservation.status !== 'CONFIRMED') {
      throw new BadRequestException(
        `Cannot check in. Reservation status is: ${reservation.status}`,
      );
    }

    // Soft proximity check — warn host if driver hasn't been detected nearby
    if (!force) {
      const driverNearby = await this.prisma.notification.findFirst({
        where: {
          userId: reservation.driver.user.id,
          type: { in: ['DRIVER_NEARBY', 'DRIVER_ARRIVED'] },
          data: { path: ['reservationId'], equals: reservation.id },
        },
      });

      if (!driverNearby) {
        return {
          success: false,
          warning: true,
          message:
            'Driver has not been detected nearby yet. Are you sure you want to proceed with check-in?',
        };
      }
    }

    // Check arrival window
    const now = new Date();
    if (now > reservation.arrivalDeadline) {
      throw new BadRequestException(
        'Arrival window has expired. The reservation has been forfeited.',
      );
    }

    // Update reservation to ACTIVE and start session
    const updatedReservation: ReservationRecord =
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.reservation.update({
          where: { id: reservation.id },
          data: {
            status: 'ACTIVE',
            sessionStartedAt: now,
          },
        });

        return updated;
      });

    return {
      success: true,
      message: `Session started at Slot ${reservation.parkingSpace.name || reservation.parkingSpace.slotNumber}`,
      reservation: {
        id: updatedReservation.id,
        status: updatedReservation.status,
        slotNumber: reservation.parkingSpace.slotNumber,
        slotName: reservation.parkingSpace.name,
        sessionStartedAt: toNullable<Date>(updatedReservation.sessionStartedAt),
        totalAmount: updatedReservation.totalAmount,
      },
      driver: {
        name: `${reservation.driver.user.firstName || ''} ${reservation.driver.user.lastName || ''}`.trim(),
        phone: reservation.driver.user.phoneNumber,
        licenseNumber: toNullable<string>(reservation.driver.licenseNumber),
        vehicle: reservation.driver.vehicles[0] || null,
      },
    };
  }

  /**
   * Valet/Host: Scan QR code for exit — ends session, calculates total, settles payment
   */
  async verifyExitQR(hostUserId: string, qrCode: string) {
    const host = await this.prisma.host.findUnique({
      where: { userId: hostUserId },
    });

    if (!host) {
      throw new ForbiddenException('Only hosts can scan QR codes');
    }

    const reservation = await this.prisma.reservation.findFirst({
      where: { qrCode },
      include: {
        parkingSpace: {
          include: {
            parkingLocation: true,
          },
        },
        driver: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new BadRequestException('Invalid QR code');
    }

    // Verify this is the host's parking location
    if (reservation.parkingSpace.parkingLocation.hostId !== host.id) {
      throw new ForbiddenException(
        'This reservation is not for your parking location',
      );
    }

    // Check reservation status
    if (reservation.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Cannot check out. Reservation status is: ${reservation.status}`,
      );
    }

    const now = new Date();
    const sessionStart = new Date(reservation.sessionStartedAt as Date);
    const pricePerHour = new Decimal(
      reservation.parkingSpace.parkingLocation.basePricePerHour,
    );

    // Calculate actual duration (round up to nearest hour)
    const durationMs = now.getTime() - sessionStart.getTime();
    const durationHours = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60)));
    const totalFee = pricePerHour.mul(durationHours);
    const platformCommission = totalFee
      .mul(this.PLATFORM_COMMISSION_RATE)
      .toDecimalPlaces(2);
    const hostPayoutAmount = Decimal.max(
      totalFee.sub(platformCommission),
      0,
    ).toDecimalPlaces(2);

    // First hour was already paid (escrow)
    const escrowAmount = new Decimal(String(reservation.escrowAmount ?? 0));
    const additionalCharge = Decimal.max(totalFee.sub(escrowAmount), 0);

    // Process exit and payment
    const result: ReservationRecord = await this.prisma.$transaction(
      async (tx) => {
        let remainingDue = new Decimal(0);

        // Deduct additional charge from driver wallet (beyond first hour escrow)
        if (additionalCharge.gt(0)) {
          const driverWallet = await tx.wallet.findUnique({
            where: { userId: reservation.driver.userId },
          });

          if (driverWallet) {
            const balance = new Decimal(driverWallet.balance);
            const chargeAmount = Decimal.min(additionalCharge, balance);
            remainingDue = Decimal.max(
              additionalCharge.sub(chargeAmount),
              0,
            ).toDecimalPlaces(2);

            if (chargeAmount.gt(0)) {
              await tx.walletTransaction.create({
                data: {
                  walletId: driverWallet.id,
                  type: 'DEBIT',
                  source: 'RESERVATION_PAYMENT',
                  amount: chargeAmount,
                  referenceId: reservation.id,
                  balanceBefore: driverWallet.balance,
                  balanceAfter: balance.sub(chargeAmount),
                },
              });

              await tx.wallet.update({
                where: { id: driverWallet.id },
                data: {
                  balance: { decrement: chargeAmount.toNumber() },
                },
              });
            }
          } else {
            // No wallet at all — full additional charge is outstanding
            remainingDue = additionalCharge.toDecimalPlaces(2);
          }
        }

        const isPaymentPending = remainingDue.gt(0);

        // Only pay host if driver paid in full
        let hostPayoutTransactionId: string | null = null;

        if (!isPaymentPending) {
          const hostWallet = await tx.wallet.findUnique({
            where: { userId: host.userId },
          });

          if (hostWallet) {
            const hostPayoutTransaction = await tx.walletTransaction.create({
              data: {
                walletId: hostWallet.id,
                type: 'CREDIT',
                source: 'BOOKING_PAYOUT',
                amount: hostPayoutAmount,
                referenceId: reservation.id,
                balanceBefore: hostWallet.balance,
                balanceAfter: new Decimal(hostWallet.balance).add(
                  hostPayoutAmount,
                ),
              },
            });

            hostPayoutTransactionId = hostPayoutTransaction.id;

            await tx.wallet.update({
              where: { id: hostWallet.id },
              data: {
                balance: { increment: hostPayoutAmount.toNumber() },
              },
            });
          }
        }

        // Update reservation — PAYMENT_PENDING if driver owes, otherwise COMPLETED
        const updated = await tx.reservation.update({
          where: { id: reservation.id },
          data: {
            status: isPaymentPending ? 'PAYMENT_PENDING' : 'COMPLETED',
            sessionEndedAt: now,
            finalAmount: totalFee,
            totalAmount: totalFee,
            commissionRate: this.PLATFORM_COMMISSION_RATE,
            platformFee: platformCommission,
            hostPayoutAmount: hostPayoutAmount,
            hostPayoutId: hostPayoutTransactionId,
            remainingDue: isPaymentPending ? remainingDue : null,
          },
        });

        // Free up the parking space regardless of payment status
        await tx.parkingSpace.update({
          where: { id: reservation.parkingSpaceId },
          data: { status: 'AVAILABLE' },
        });
        await this.syncLocationAvailableSlotsBySpaceId(
          tx,
          reservation.parkingSpaceId,
        );

        return updated;
      },
    );

    // Push real-time updates after transaction commits
    void this.emitSlotUpdate(reservation.parkingSpaceId);
    void this.emitBalanceUpdate(reservation.driver.userId);
    void this.emitBalanceUpdate(hostUserId);

    const locationTitle = reservation.parkingSpace.parkingLocation.title;
    const isPaymentPending = result.status === 'PAYMENT_PENDING';
    const remainingDueValue = (result as any).remainingDue;

    if (isPaymentPending) {
      // Notify driver they owe a balance
      this.notificationsService
        .send({
          userId: reservation.driver.userId,
          title: 'Insufficient Balance — Payment Due',
          message: `Your session at ${locationTitle} has ended but your wallet didn't have enough funds. You owe ₱${remainingDueValue?.toFixed(2) ?? '0.00'}. Please top up to clear this before booking again.`,
          type: 'GENERAL',
          data: { reservationId: reservation.id, screen: 'payment' },
        })
        .catch(() => {});
      // Notify host their payout is on hold
      this.notificationsService
        .send({
          userId: hostUserId,
          title: 'Payout On Hold',
          message: `A driver's session at ${locationTitle} has ended but they had insufficient funds. Your payout of ₱${hostPayoutAmount.toFixed(2)} will be released once they settle their balance.`,
          type: 'GENERAL',
          data: { reservationId: reservation.id },
        })
        .catch(() => {});
    } else {
      // Notify both driver and host of completion
      this.notificationsService
        .notifyBookingCompleted(
          reservation.driver.userId,
          hostUserId,
          reservation.id,
          locationTitle,
        )
        .catch(() => {});
    }

    return {
      success: true,
      message: isPaymentPending
        ? 'Session ended. Insufficient wallet balance — please top up to settle your remaining due.'
        : 'Session ended. Payment has been processed.',
      reservation: {
        id: result.id,
        status: result.status,
        sessionStartedAt: toNullable<Date>(result.sessionStartedAt),
        sessionEndedAt: toNullable<Date>(result.sessionEndedAt),
        totalAmount: result.totalAmount,
        finalAmount: toNullable(result.finalAmount),
        commissionRate: result.commissionRate,
        platformFee: toNullable(result.platformFee),
        hostPayoutAmount: toNullable(result.hostPayoutAmount),
        remainingDue: remainingDueValue ? remainingDueValue.toNumber() : null,
        durationHours,
      },
      additionalCharge: additionalCharge.gt(0)
        ? additionalCharge.toNumber()
        : null,
    };
  }

  /**
   * Settle remaining due on a PAYMENT_PENDING reservation
   */
  async settleRemainingDue(userId: string, reservationId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { userId } });
    if (!driver)
      throw new ForbiddenException('Only drivers can settle payments.');

    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        parkingSpace: {
          include: { parkingLocation: { include: { host: true } } },
        },
        driver: true,
      },
    });

    if (!reservation || reservation.driverId !== driver.id) {
      throw new NotFoundException('Reservation not found.');
    }
    if (reservation.status !== 'PAYMENT_PENDING') {
      throw new BadRequestException(
        'This reservation has no outstanding balance.',
      );
    }

    const remainingDue = new Decimal(
      String((reservation as any).remainingDue ?? 0),
    );
    if (remainingDue.lte(0)) {
      throw new BadRequestException('No remaining due on this reservation.');
    }

    const driverWallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });
    if (!driverWallet) throw new BadRequestException('Wallet not found.');

    const balance = new Decimal(driverWallet.balance);
    if (balance.lt(remainingDue)) {
      throw new BadRequestException(
        `Insufficient balance. You need ₱${remainingDue.toFixed(2)} but only have ₱${balance.toFixed(2)}.`,
      );
    }

    const host = reservation.parkingSpace.parkingLocation.host;
    const totalFee = new Decimal(
      String(reservation.finalAmount ?? reservation.totalAmount),
    );
    const platformCommission = totalFee
      .mul(this.PLATFORM_COMMISSION_RATE)
      .toDecimalPlaces(2);
    const hostPayoutAmount = Decimal.max(
      totalFee.sub(platformCommission),
      0,
    ).toDecimalPlaces(2);

    await this.prisma.$transaction(async (tx) => {
      // Deduct remaining due from driver wallet
      await tx.walletTransaction.create({
        data: {
          walletId: driverWallet.id,
          type: 'DEBIT',
          source: 'RESERVATION_PAYMENT',
          amount: remainingDue,
          referenceId: reservation.id,
          balanceBefore: driverWallet.balance,
          balanceAfter: balance.sub(remainingDue),
        },
      });
      await tx.wallet.update({
        where: { id: driverWallet.id },
        data: { balance: { decrement: remainingDue.toNumber() } },
      });

      // Credit host now that full payment is received
      const hostWallet = await tx.wallet.findUnique({
        where: { userId: host.userId },
      });
      if (hostWallet) {
        await tx.walletTransaction.create({
          data: {
            walletId: hostWallet.id,
            type: 'CREDIT',
            source: 'BOOKING_PAYOUT',
            amount: hostPayoutAmount,
            referenceId: reservation.id,
            balanceBefore: hostWallet.balance,
            balanceAfter: new Decimal(hostWallet.balance).add(hostPayoutAmount),
          },
        });
        await tx.wallet.update({
          where: { id: hostWallet.id },
          data: { balance: { increment: hostPayoutAmount.toNumber() } },
        });
      }

      // Free the parking space so it is available for new bookings
      await tx.parkingSpace.update({
        where: { id: reservation.parkingSpaceId },
        data: { status: 'AVAILABLE' },
      });
      await this.syncLocationAvailableSlotsBySpaceId(
        tx,
        reservation.parkingSpaceId,
      );

      // Mark reservation as COMPLETED
      await tx.reservation.update({
        where: { id: reservation.id },
        data: {
          status: 'COMPLETED',
          remainingDue: null,
          hostPayoutAmount,
        },
      });
    });

    // Push real-time wallet updates after transaction commits
    void this.emitBalanceUpdate(userId);
    void this.emitBalanceUpdate(
      reservation.parkingSpace.parkingLocation.host.userId,
    );

    // Notify driver and host
    const locationTitle = reservation.parkingSpace.parkingLocation.title;
    this.notificationsService
      .notifyBookingCompleted(
        userId,
        host.userId,
        reservation.id,
        locationTitle,
      )
      .catch(() => {});
    this.notificationsService
      .send({
        userId: host.userId,
        title: 'Payout Released',
        message: `The driver has settled their outstanding balance for ${locationTitle}. ₱${hostPayoutAmount.toFixed(2)} has been credited to your wallet.`,
        type: 'BOOKING_COMPLETED',
        data: {
          reservationId: reservation.id,
          screen: 'host-reservation-detail',
        },
      })
      .catch(() => {});

    return {
      success: true,
      message: 'Outstanding balance settled. Booking is now complete.',
    };
  }

  /**
   * Cancel a reservation (before session starts)
   */
  async cancelReservation(userId: string, reservationId: string) {
    await this.processReservationTimeouts();

    const driver = await this.prisma.driver.findUnique({
      where: { userId },
    });

    if (!driver) {
      throw new ForbiddenException(
        'Only drivers can cancel their reservations',
      );
    }

    const reservation = (await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        walletTransaction: true,
      },
    })) as ReservationWithTransaction | null;

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.driverId !== driver.id) {
      throw new ForbiddenException('You can only cancel your own reservations');
    }

    if (!['PENDING', 'CONFIRMED'].includes(reservation.status)) {
      throw new BadRequestException(
        `Cannot cancel reservation with status: ${reservation.status}`,
      );
    }

    const shouldRefund = reservation.status === 'PENDING';

    // Refund the escrow amount
    const result = await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (shouldRefund && wallet && reservation.escrowAmount) {
        const refundAmount = new Decimal(String(reservation.escrowAmount));

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'CREDIT',
            source: 'REFUND',
            amount: refundAmount,
            referenceId: reservation.id,
            balanceBefore: wallet.balance,
            balanceAfter: new Decimal(wallet.balance).add(refundAmount),
          },
        });

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: { increment: refundAmount.toNumber() },
          },
        });
      }

      // Free up the parking space
      await tx.parkingSpace.update({
        where: { id: reservation.parkingSpaceId },
        data: { status: 'AVAILABLE' },
      });
      await this.syncLocationAvailableSlotsBySpaceId(
        tx,
        reservation.parkingSpaceId,
      );

      // Update reservation status
      return tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: 'CANCELLED',
          cancelledBy: 'DRIVER',
          escrowAmount: 0,
        },
      });
    });

    // Push real-time updates after transaction commits
    void this.emitSlotUpdate(reservation.parkingSpaceId);
    void this.emitBalanceUpdate(userId);

    // Notify host that driver cancelled
    const cancelledRes = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        parkingSpace: {
          include: { parkingLocation: { include: { host: true } } },
        },
      },
    });
    if (cancelledRes) {
      this.notificationsService
        .notifyBookingCancelled(
          cancelledRes.parkingSpace.parkingLocation.host.userId,
          reservationId,
          cancelledRes.parkingSpace.parkingLocation.title,
          'driver',
        )
        .catch(() => {});
    }

    return {
      success: true,
      message: shouldRefund
        ? 'Reservation cancelled. Your payment has been refunded.'
        : 'Reservation cancelled. No refund was issued because the host already approved this booking.',
      reservation: {
        id: result.id,
        status: result.status,
      },
    };
  }

  /**
   * Get host's location reservations
   */
  async getHostReservations(
    hostUserId: string,
    locationId?: string,
    status?: string,
  ) {
    await this.processReservationTimeouts();

    const host = await this.prisma.host.findUnique({
      where: { userId: hostUserId },
      include: {
        parkingLocations: {
          select: { id: true },
        },
      },
    });

    if (!host) {
      return [];
    }

    const locationIds = locationId
      ? [locationId]
      : host.parkingLocations.map((l) => l.id);

    const whereClause: Prisma.ReservationWhereInput = {
      parkingSpace: {
        parkingLocationId: { in: locationIds },
      },
    };

    if (status) {
      const filterMap: Record<string, Prisma.ReservationWhereInput['status']> =
        {
          Upcoming: { in: ['PENDING', 'CONFIRMED'] },
          Active: { equals: 'ACTIVE' },
          Past: { in: ['COMPLETED', 'CANCELLED', 'EXPIRED'] },
        };
      const mapped = filterMap[status];
      if (mapped) {
        whereClause.status = mapped;
      } else {
        whereClause.status = status as Prisma.EnumReservationStatusFilter;
      }
    }

    const reservations = await this.prisma.reservation.findMany({
      where: whereClause,
      include: {
        parkingSpace: {
          include: {
            parkingLocation: true,
          },
        },
        driver: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                phoneNumber: true,
                profilePicture: true,
                sex: true,
              },
            },
            vehicles: {
              where: { isActive: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reservations.map((r) => this.mapHostReservation(r));
  }

  /**
   * Host: Get a single reservation by ID
   */
  async getHostReservation(hostUserId: string, reservationId: string) {
    await this.processReservationTimeouts();

    const host = await this.prisma.host.findUnique({
      where: { userId: hostUserId },
      include: { parkingLocations: { select: { id: true } } },
    });

    if (!host) {
      throw new ForbiddenException('Only hosts can view this reservation');
    }

    const locationIds = host.parkingLocations.map((l) => l.id);

    const r = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        parkingSpace: {
          include: { parkingLocation: true },
        },
        driver: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                phoneNumber: true,
                profilePicture: true,
                sex: true,
              },
            },
            vehicles: {
              where: { isActive: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!r || !locationIds.includes(r.parkingSpace.parkingLocationId)) {
      throw new NotFoundException('Reservation not found');
    }

    return this.mapHostReservation(r);
  }

  private mapHostReservation(r: HostReservationRecord) {
    return {
      id: r.id,
      qrCode: r.qrCode,
      status: r.status,
      arrivalDeadline: r.arrivalDeadline,
      sessionStartedAt: toNullable<Date>(r.sessionStartedAt),
      sessionEndedAt: toNullable<Date>(r.sessionEndedAt),
      totalAmount: r.totalAmount,
      finalAmount: toNullable(r.finalAmount),
      commissionRate: r.commissionRate,
      platformFee: toNullable(r.platformFee),
      hostPayoutAmount:
        r.hostPayoutAmount != null ? Number(r.hostPayoutAmount) : null,
      overtimeAmount: toNullable(r.overtimeAmount),
      remainingDue:
        (r as any).remainingDue != null
          ? Number((r as any).remainingDue)
          : null,
      createdAt: r.createdAt,
      parkingSpace: {
        id: r.parkingSpace.id,
        slotNumber: r.parkingSpace.slotNumber,
        name: r.parkingSpace.name,
        description: r.parkingSpace.description,
      },
      parkingLocation: {
        id: r.parkingSpace.parkingLocation.id,
        title: r.parkingSpace.parkingLocation.title,
        address: r.parkingSpace.parkingLocation.address,
        basePricePerHour: r.parkingSpace.parkingLocation.basePricePerHour,
      },
      driver: {
        name: `${r.driver.user.firstName || ''} ${r.driver.user.lastName || ''}`.trim(),
        phone: r.driver.user.phoneNumber,
        image: toNullable<string>(r.driver.user.profilePicture),
        sex: (r.driver.user as any).sex ?? null,
        licenseNumber: toNullable<string>(r.driver.licenseNumber),
        licenseImageUrl: toNullable<string>(r.driver.licenseImageUrl),
        vehicle: r.driver.vehicles[0] || null,
      },
    };
  }
}
