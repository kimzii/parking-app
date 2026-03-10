import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import {
  CreateReservationDto,
  CalculateFeeDto,
} from './dto/create-reservation.dto';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import * as crypto from 'crypto';
import type {
  ReservationRecord,
  ReservationWithSpaceAndLocation,
  ReservationWithPrimaryImage,
  ReservationWithDriverDetails,
  ReservationWithTransaction,
} from './types/reservation.types';

// Helper to safely extract nullable Prisma fields that ESLint can't resolve
function toNullable<T>(value: unknown): T | null {
  return (value ?? null) as T | null;
}

@Injectable()
export class ReservationsService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
  ) {}

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
   * Calculate parking duration in hours
   */
  private calculateDurationHours(startTime: Date, endTime: Date): number {
    const durationMs = endTime.getTime() - startTime.getTime();
    return Math.ceil(durationMs / (1000 * 60 * 60)); // Round up to nearest hour
  }

  /**
   * Calculate estimated parking fee
   */
  async calculateFee(dto: CalculateFeeDto) {
    const parkingSpace = await this.prisma.parkingSpace.findUnique({
      where: { id: dto.parkingSpaceId },
      include: {
        parkingLocation: true,
      },
    });

    if (!parkingSpace) {
      throw new NotFoundException('Parking space not found');
    }

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (endTime <= startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    const durationHours = this.calculateDurationHours(startTime, endTime);
    const pricePerHour = new Decimal(
      parkingSpace.parkingLocation.basePricePerHour,
    );
    const totalAmount = pricePerHour.mul(durationHours);

    return {
      parkingSpaceId: dto.parkingSpaceId,
      locationTitle: parkingSpace.parkingLocation.title,
      slotNumber: parkingSpace.slotNumber,
      startTime,
      endTime,
      durationHours,
      pricePerHour: pricePerHour.toNumber(),
      totalAmount: totalAmount.toNumber(),
    };
  }

  /**
   * Create a new reservation with wallet debit and escrow
   */
  async createReservation(userId: string, dto: CreateReservationDto) {
    // Get the driver record
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
    });

    if (!driver) {
      throw new BadRequestException(
        'You must be registered as a driver to make reservations',
      );
    }

    // Get parking space and location
    const parkingSpace = await this.prisma.parkingSpace.findUnique({
      where: { id: dto.parkingSpaceId },
      include: {
        parkingLocation: {
          include: {
            host: true,
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

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    const now = new Date();

    // Validate times
    if (startTime < now) {
      throw new BadRequestException('Start time cannot be in the past');
    }

    if (endTime <= startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // Check for conflicting reservations
    const conflictingReservation = await this.prisma.reservation.findFirst({
      where: {
        parkingSpaceId: dto.parkingSpaceId,
        status: { in: ['PENDING', 'CONFIRMED', 'ACTIVE'] },
        OR: [
          {
            startTime: { lte: startTime },
            endTime: { gt: startTime },
          },
          {
            startTime: { lt: endTime },
            endTime: { gte: endTime },
          },
          {
            startTime: { gte: startTime },
            endTime: { lte: endTime },
          },
        ],
      },
    });

    if (conflictingReservation) {
      throw new BadRequestException('This time slot is already booked');
    }

    // Calculate fee
    const durationHours = this.calculateDurationHours(startTime, endTime);
    const pricePerHour = new Decimal(
      parkingSpace.parkingLocation.basePricePerHour,
    );
    const totalAmount = pricePerHour.mul(durationHours);

    // Check wallet balance
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new BadRequestException(
        'Wallet not found. Please top up your wallet first.',
      );
    }

    if (new Decimal(wallet.balance).lt(totalAmount)) {
      throw new BadRequestException(
        `Insufficient balance. Required: ${totalAmount.toFixed(2)}, Available: ${new Decimal(wallet.balance).toFixed(2)}`,
      );
    }

    // Generate QR code
    const { qrCode, qrCodeSecret } = this.generateQRCode(crypto.randomUUID());

    // Create reservation with wallet debit in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Debit wallet and put amount in escrow
      const balanceBefore = wallet.balance;
      const balanceAfter = new Decimal(balanceBefore).sub(totalAmount);

      const walletTransaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT',
          source: 'RESERVATION_PAYMENT',
          amount: totalAmount,
          balanceBefore,
          balanceAfter,
        },
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: totalAmount.toNumber() },
        },
      });

      // Create reservation
      const reservation = await tx.reservation.create({
        data: {
          driverId: driver.id,
          parkingSpaceId: dto.parkingSpaceId,
          startTime,
          endTime,
          status: 'PENDING',
          qrCode,
          qrCodeSecret,
          totalAmount,
          escrowAmount: totalAmount,
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
          driver: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      return { reservation, walletTransaction };
    });

    const reservation = result.reservation as ReservationWithSpaceAndLocation;
    const space = reservation.parkingSpace;
    const location = space.parkingLocation;

    return {
      id: reservation.id,
      qrCode: reservation.qrCode,
      status: reservation.status,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      totalAmount: reservation.totalAmount,
      escrowAmount: toNullable(reservation.escrowAmount),
      parkingSpace: {
        id: space.id,
        slotNumber: space.slotNumber,
        name: space.name,
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
        'Reservation confirmed! Show your QR code to the host when you arrive.',
    };
  }

  /**
   * Get driver's reservations
   */
  async getDriverReservations(userId: string, status?: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
    });

    if (!driver) {
      return [];
    }

    const whereClause: Prisma.ReservationWhereInput = { driverId: driver.id };
    if (status) {
      whereClause.status = status as Prisma.EnumReservationStatusFilter;
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

    return reservations.map((record) => {
      const r = record as ReservationWithPrimaryImage;
      return {
        id: r.id,
        qrCode: r.qrCode,
        status: r.status,
        startTime: r.startTime,
        endTime: r.endTime,
        actualEntryTime: toNullable<Date>(r.actualEntryTime),
        actualExitTime: toNullable<Date>(r.actualExitTime),
        totalAmount: r.totalAmount,
        escrowAmount: toNullable(r.escrowAmount),
        finalAmount: toNullable(r.finalAmount),
        overtimeAmount: toNullable(r.overtimeAmount),
        parkingSpace: {
          id: r.parkingSpace.id,
          slotNumber: r.parkingSpace.slotNumber,
          name: r.parkingSpace.name,
        },
        parkingLocation: {
          id: r.parkingSpace.parkingLocation.id,
          title: r.parkingSpace.parkingLocation.title,
          address: r.parkingSpace.parkingLocation.address,
          latitude: r.parkingSpace.parkingLocation.latitude,
          longitude: r.parkingSpace.parkingLocation.longitude,
          image: r.parkingSpace.parkingLocation.images[0]?.imageUrl || null,
        },
      };
    });
  }

  /**
   * Get a single reservation by ID
   */
  async getReservation(userId: string, reservationId: string) {
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

    const typedReservation =
      reservation as unknown as ReservationWithSpaceAndLocation;
    const space = typedReservation.parkingSpace;
    const location = space.parkingLocation;

    return {
      id: typedReservation.id,
      qrCode: typedReservation.qrCode,
      status: typedReservation.status,
      startTime: typedReservation.startTime,
      endTime: typedReservation.endTime,
      actualEntryTime: toNullable(typedReservation.actualEntryTime),
      actualExitTime: toNullable(typedReservation.actualExitTime),
      totalAmount: typedReservation.totalAmount,
      escrowAmount: toNullable(typedReservation.escrowAmount),
      finalAmount: toNullable(typedReservation.finalAmount),
      overtimeAmount: toNullable(typedReservation.overtimeAmount),
      parkingSpace: {
        id: space.id,
        slotNumber: space.slotNumber,
        name: space.name,
      },
      parkingLocation: {
        id: location.id,
        title: location.title,
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        images: location.images,
      },
    };
  }

  /**
   * Host: Verify QR code for entry scan
   */
  async verifyEntryQR(hostUserId: string, qrCode: string) {
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

    // Check time window (allow 30 minutes before start time)
    const now = new Date();
    const windowStart = new Date(
      reservation.startTime.getTime() - 30 * 60 * 1000,
    );
    const windowEnd = reservation.endTime;

    if (now < windowStart) {
      throw new BadRequestException(
        `Too early to check in. Reservation starts at ${reservation.startTime.toLocaleTimeString()}`,
      );
    }

    if (now > windowEnd) {
      throw new BadRequestException('Reservation time has expired');
    }

    // Update reservation to ACTIVE and record entry time
    const updatedReservation: ReservationRecord =
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.reservation.update({
          where: { id: reservation.id },
          data: {
            status: 'ACTIVE',
            actualEntryTime: now,
          },
        });

        // Update parking space status
        await tx.parkingSpace.update({
          where: { id: reservation.parkingSpaceId },
          data: { status: 'OCCUPIED' },
        });

        return updated;
      });

    return {
      success: true,
      message: 'Entry verified successfully',
      reservation: {
        id: updatedReservation.id,
        status: updatedReservation.status,
        slotNumber: reservation.parkingSpace.slotNumber,
        startTime: updatedReservation.startTime,
        endTime: updatedReservation.endTime,
        actualEntryTime: toNullable<Date>(updatedReservation.actualEntryTime),
        totalAmount: updatedReservation.totalAmount,
      },
      driver: {
        name: `${reservation.driver.user.firstName || ''} ${reservation.driver.user.lastName || ''}`.trim(),
        phone: reservation.driver.user.phoneNumber,
        vehicle: reservation.driver.vehicles[0] || null,
      },
    };
  }

  /**
   * Host: Verify QR code for exit scan
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
    const pricePerHour = new Decimal(
      reservation.parkingSpace.parkingLocation.basePricePerHour,
    );

    // Calculate actual duration and any overtime
    let overtimeAmount = new Decimal(0);
    let finalAmount = new Decimal(reservation.totalAmount);

    if (now > reservation.endTime) {
      // Calculate overtime
      const overtimeHours = this.calculateDurationHours(
        reservation.endTime,
        now,
      );
      overtimeAmount = pricePerHour.mul(overtimeHours).mul(1.5); // 1.5x rate for overtime
      finalAmount = finalAmount.add(overtimeAmount);
    }

    // Process exit and payment
    const result: ReservationRecord = await this.prisma.$transaction(
      async (tx) => {
        // If there's overtime, deduct from driver's wallet
        if (overtimeAmount.gt(0)) {
          const driverWallet = await tx.wallet.findUnique({
            where: { userId: reservation.driver.userId },
          });

          if (
            driverWallet &&
            new Decimal(driverWallet.balance).gte(overtimeAmount)
          ) {
            // Deduct overtime from driver wallet
            await tx.walletTransaction.create({
              data: {
                walletId: driverWallet.id,
                type: 'DEBIT',
                source: 'RESERVATION_PAYMENT',
                amount: overtimeAmount,
                referenceId: reservation.id,
                balanceBefore: driverWallet.balance,
                balanceAfter: new Decimal(driverWallet.balance).sub(
                  overtimeAmount,
                ),
              },
            });

            await tx.wallet.update({
              where: { id: driverWallet.id },
              data: {
                balance: { decrement: overtimeAmount.toNumber() },
              },
            });
          }
        }

        // Release escrow to host wallet
        const hostWallet = await tx.wallet.findUnique({
          where: { userId: host.userId },
        });

        if (hostWallet) {
          const payoutAmount = finalAmount;

          await tx.walletTransaction.create({
            data: {
              walletId: hostWallet.id,
              type: 'CREDIT',
              source: 'HOST_PAYOUT',
              amount: payoutAmount,
              referenceId: reservation.id,
              balanceBefore: hostWallet.balance,
              balanceAfter: new Decimal(hostWallet.balance).add(payoutAmount),
            },
          });

          await tx.wallet.update({
            where: { id: hostWallet.id },
            data: {
              balance: { increment: payoutAmount.toNumber() },
            },
          });
        }

        // Update reservation
        const updated = await tx.reservation.update({
          where: { id: reservation.id },
          data: {
            status: 'COMPLETED',
            actualExitTime: now,
            finalAmount,
            overtimeAmount: overtimeAmount.gt(0) ? overtimeAmount : null,
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

    return {
      success: true,
      message: 'Exit verified successfully. Payment released to host.',
      reservation: {
        id: result.id,
        status: result.status,
        startTime: result.startTime,
        endTime: result.endTime,
        actualEntryTime: toNullable<Date>(result.actualEntryTime),
        actualExitTime: toNullable<Date>(result.actualExitTime),
        totalAmount: result.totalAmount,
        finalAmount: toNullable(result.finalAmount),
        overtimeAmount: toNullable(result.overtimeAmount),
      },
      hadOvertime: overtimeAmount.gt(0),
      overtimeCharge: overtimeAmount.gt(0) ? overtimeAmount.toNumber() : null,
    };
  }

  /**
   * Cancel a reservation (before entry)
   */
  async cancelReservation(userId: string, reservationId: string) {
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

    // Refund the escrow amount
    const result = await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (wallet && reservation.escrowAmount) {
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

      // Update reservation status
      return tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: 'CANCELLED',
          escrowAmount: 0,
        },
      });
    });

    return {
      success: true,
      message: 'Reservation cancelled. Your payment has been refunded.',
      reservation: {
        id: result.id,
        status: result.status,
      },
    };
  }

  /**
   * Host confirms a pending reservation
   */
  async confirmReservation(hostUserId: string, reservationId: string) {
    const host = await this.prisma.host.findUnique({
      where: { userId: hostUserId },
      include: {
        parkingLocations: { select: { id: true } },
      },
    });

    if (!host) {
      throw new ForbiddenException('Only hosts can confirm reservations');
    }

    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        parkingSpace: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    const hostLocationIds = host.parkingLocations.map((l) => l.id);
    if (!hostLocationIds.includes(reservation.parkingSpace.parkingLocationId)) {
      throw new ForbiddenException(
        'You can only confirm reservations for your own locations',
      );
    }

    if (reservation.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot confirm reservation with status: ${reservation.status}`,
      );
    }

    const updated = await this.prisma.reservation.update({
      where: { id: reservationId },
      data: { status: 'CONFIRMED' },
    });

    return {
      success: true,
      message: 'Reservation confirmed successfully.',
      reservation: { id: updated.id, status: updated.status },
    };
  }

  /**
   * Host rejects a pending reservation (refunds driver)
   */
  async rejectReservation(hostUserId: string, reservationId: string) {
    const host = await this.prisma.host.findUnique({
      where: { userId: hostUserId },
      include: {
        parkingLocations: { select: { id: true } },
      },
    });

    if (!host) {
      throw new ForbiddenException('Only hosts can reject reservations');
    }

    const reservation = (await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        parkingSpace: true,
        walletTransaction: true,
      },
    })) as
      | (ReservationWithTransaction & {
          parkingSpace: { parkingLocationId: string };
        })
      | null;

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    const hostLocationIds = host.parkingLocations.map((l) => l.id);
    if (!hostLocationIds.includes(reservation.parkingSpace.parkingLocationId)) {
      throw new ForbiddenException(
        'You can only reject reservations for your own locations',
      );
    }

    if (reservation.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot reject reservation with status: ${reservation.status}`,
      );
    }

    // Refund the driver
    const result = await this.prisma.$transaction(async (tx) => {
      const driver = await tx.driver.findUnique({
        where: { id: reservation.driverId },
      });

      if (driver && reservation.escrowAmount) {
        const wallet = await tx.wallet.findUnique({
          where: { userId: driver.userId },
        });

        if (wallet) {
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
      }

      return tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: 'CANCELLED',
          escrowAmount: 0,
        },
      });
    });

    return {
      success: true,
      message: 'Reservation rejected. The driver has been refunded.',
      reservation: { id: result.id, status: result.status },
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
          Past: { in: ['COMPLETED', 'CANCELLED'] },
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
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reservations.map((record) => {
      const r = record as ReservationWithDriverDetails;
      return {
        id: r.id,
        qrCode: r.qrCode,
        status: r.status,
        startTime: r.startTime,
        endTime: r.endTime,
        actualEntryTime: toNullable<Date>(r.actualEntryTime),
        actualExitTime: toNullable<Date>(r.actualExitTime),
        totalAmount: r.totalAmount,
        finalAmount: toNullable(r.finalAmount),
        overtimeAmount: toNullable(r.overtimeAmount),
        parkingSpace: {
          id: r.parkingSpace.id,
          slotNumber: r.parkingSpace.slotNumber,
          name: r.parkingSpace.name,
        },
        parkingLocation: {
          id: r.parkingSpace.parkingLocation.id,
          title: r.parkingSpace.parkingLocation.title,
        },
        driver: {
          name: `${r.driver.user.firstName || ''} ${r.driver.user.lastName || ''}`.trim(),
          phone: r.driver.user.phoneNumber,
          image: toNullable<string>(r.driver.user.profilePicture),
          vehicle: r.driver.vehicles[0] || null,
        },
      };
    });
  }
}
