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
import { CreateReservationDto } from './dto/create-reservation.dto';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import * as crypto from 'crypto';
import type {
  ReservationRecord,
  ReservationWithTransaction,
} from './types/reservation.types';

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
  ) {}

  private readonly HOST_APPROVAL_WINDOW_MS = 5 * 60 * 1000;
  private readonly DRIVER_ARRIVAL_WINDOW_MS = 60 * 60 * 1000;
  private timeoutSweepInterval: NodeJS.Timeout | null = null;

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
        driver: {
          select: { userId: true },
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

          await tx.reservation.update({
            where: { id: reservation.id },
            data: {
              status: 'CANCELLED',
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

          await tx.reservation.update({
            where: { id: reservation.id },
            data: {
              status: 'EXPIRED',
              escrowAmount: 0,
            },
          });
        }
      });
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

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    if (closeMinutes > openMinutes) {
      return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    }
    // Overnight hours (e.g. 22:00 - 06:00)
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
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
    let selectedVehicle: Awaited<
      ReturnType<typeof this.prisma.driverVehicle.findFirst>
    > = null;
    if (dto.vehicleId) {
      selectedVehicle = await this.prisma.driverVehicle.findFirst({
        where: {
          id: dto.vehicleId,
          driverId: driver.id,
          isActive: true,
        },
      });
      if (!selectedVehicle) {
        throw new BadRequestException(
          'Selected vehicle not found or is not active.',
        );
      }
    } else {
      // Fall back to most recent active vehicle
      selectedVehicle = await this.prisma.driverVehicle.findFirst({
        where: {
          driverId: driver.id,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!selectedVehicle) {
      throw new BadRequestException(
        'Please add at least one active vehicle before booking.',
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

    // Check if location is currently open
    if (!this.isLocationOpen(parkingSpace.parkingLocation)) {
      throw new BadRequestException(
        `This location is currently closed. Operating hours: ${parkingSpace.parkingLocation.openTime} - ${parkingSpace.parkingLocation.closeTime}`,
      );
    }

    // Check for existing active reservation by this driver
    const existingReservation = await this.prisma.reservation.findFirst({
      where: {
        driverId: driver.id,
        status: { in: ['PENDING', 'CONFIRMED', 'ACTIVE'] },
      },
    });

    if (existingReservation) {
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
        latitude: location.latitude,
        longitude: location.longitude,
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
      overtimeAmount: toNullable(r.overtimeAmount),
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
        latitude: r.parkingSpace.parkingLocation.latitude,
        longitude: r.parkingSpace.parkingLocation.longitude,
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

    // Only allow driver or host to view
    if (driver && reservation.driverId !== driver.id) {
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
      overtimeAmount: toNullable(reservation.overtimeAmount),
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
        latitude: location.latitude,
        longitude: location.longitude,
        images: location.images,
        basePricePerHour: location.basePricePerHour,
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

      return tx.reservation.update({
        where: { id: reservation.id },
        data: {
          status: 'CANCELLED',
          escrowAmount: 0,
        },
      });
    });

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
  async verifyEntryQR(hostUserId: string, qrCode: string) {
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

    // First hour was already paid (escrow)
    const escrowAmount = new Decimal(String(reservation.escrowAmount ?? 0));
    const additionalCharge = Decimal.max(totalFee.sub(escrowAmount), 0);

    // Process exit and payment
    const result: ReservationRecord = await this.prisma.$transaction(
      async (tx) => {
        // If there's additional charge beyond the first hour, deduct from driver wallet
        if (additionalCharge.gt(0)) {
          const driverWallet = await tx.wallet.findUnique({
            where: { userId: reservation.driver.userId },
          });

          if (driverWallet) {
            const balance = new Decimal(driverWallet.balance);
            const chargeAmount = Decimal.min(additionalCharge, balance);

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
          }
        }

        // Release total to host wallet
        const hostWallet = await tx.wallet.findUnique({
          where: { userId: host.userId },
        });

        if (hostWallet) {
          await tx.walletTransaction.create({
            data: {
              walletId: hostWallet.id,
              type: 'CREDIT',
              source: 'HOST_PAYOUT',
              amount: totalFee,
              referenceId: reservation.id,
              balanceBefore: hostWallet.balance,
              balanceAfter: new Decimal(hostWallet.balance).add(totalFee),
            },
          });

          await tx.wallet.update({
            where: { id: hostWallet.id },
            data: {
              balance: { increment: totalFee.toNumber() },
            },
          });
        }

        // Update reservation
        const updated = await tx.reservation.update({
          where: { id: reservation.id },
          data: {
            status: 'COMPLETED',
            sessionEndedAt: now,
            finalAmount: totalFee,
            totalAmount: totalFee,
          },
        });

        // Free up the parking space
        await tx.parkingSpace.update({
          where: { id: reservation.parkingSpaceId },
          data: { status: 'AVAILABLE' },
        });

        return updated;
      },
    );

    // Notify both driver and host of completion
    const locationTitle = reservation.parkingSpace.parkingLocation.title;
    this.notificationsService
      .notifyBookingCompleted(
        reservation.driver.userId,
        hostUserId,
        reservation.id,
        locationTitle,
      )
      .catch(() => {});

    return {
      success: true,
      message: 'Session ended. Payment has been processed.',
      reservation: {
        id: result.id,
        status: result.status,
        sessionStartedAt: toNullable<Date>(result.sessionStartedAt),
        sessionEndedAt: toNullable<Date>(result.sessionEndedAt),
        totalAmount: result.totalAmount,
        finalAmount: toNullable(result.finalAmount),
        durationHours,
      },
      additionalCharge: additionalCharge.gt(0)
        ? additionalCharge.toNumber()
        : null,
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

      // Update reservation status
      return tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: 'CANCELLED',
          escrowAmount: 0,
        },
      });
    });

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

  private mapHostReservation(r: any) {
    return {
      id: r.id,
      qrCode: r.qrCode,
      status: r.status,
      arrivalDeadline: r.arrivalDeadline,
      sessionStartedAt: toNullable<Date>(r.sessionStartedAt),
      sessionEndedAt: toNullable<Date>(r.sessionEndedAt),
      totalAmount: r.totalAmount,
      finalAmount: toNullable(r.finalAmount),
      overtimeAmount: toNullable(r.overtimeAmount),
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
        licenseNumber: toNullable<string>(r.driver.licenseNumber),
        licenseImageUrl: toNullable<string>(r.driver.licenseImageUrl),
        vehicle: r.driver.vehicles[0] || null,
      },
    };
  }
}
