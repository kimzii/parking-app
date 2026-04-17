import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import {
  LocationStatus,
  NotificationType,
  ReservationStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface DashboardStats {
  totalActiveListings: number;
  currentActiveReservations: number;
  totalUsers: number;
  totalRevenueThisMonth: number;
}

export interface FinancialStats {
  totalRevenue: number;
  totalCommission: number;
  totalPlatformFee: number;
  totalHostPayout: number;
  commissionRate: number;
  pendingPayouts: number;
  revenueChange: number;
  commissionChange: number;
}

export interface RecentTransaction {
  id: string;
  userName: string;
  userRole: string;
  email: string;
  status: string;
  amount: number;
  createdAt: Date;
}

type TransactionActorType = 'ALL' | 'DRIVER' | 'HOST';

export interface RevenueTrendPoint {
  date: string;
  revenue: number;
  commission: number;
  platformFee: number;
  hostPayout: number;
}

export interface RecentListing {
  id: string;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  allowParkAnywhere: boolean;
  hostName: string;
  status: LocationStatus;
  createdAt: Date;
}

export interface RecentActivity {
  id: string;
  user: string;
  action: string;
  time: Date;
}

export interface ReservationStats {
  totalReservations: number;
  activeReservations: number;
  completedReservations: number;
  cancelledReservations: number;
}

export interface ReservationListItem {
  id: string;
  guestName: string;
  guestProfilePicture: string | null;
  hostName: string;
  propertyTitle: string;
  arrivalDeadline: Date;
  sessionStartedAt: Date | null;
  sessionEndedAt: Date | null;
  status: ReservationStatus;
  totalAmount: number;
  cancelledBy: string | null;
  cancellationReason: string | null;
}

@Injectable()
export class DashboardService implements OnModuleInit, OnModuleDestroy {
  private readonly PLATFORM_COMMISSION_RATE = new Decimal(0.1);
  private unsuspendInterval: NodeJS.Timeout | null = null;

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  onModuleInit() {
    this.unsuspendInterval = setInterval(
      () => {
        void this.autoUnsuspendExpired().catch((error: unknown) => {
          console.error('Failed to auto-unsuspend expired users:', error);
        });
      },
      60 * 60 * 1000,
    ); // every hour
  }

  onModuleDestroy() {
    if (this.unsuspendInterval) {
      clearInterval(this.unsuspendInterval);
      this.unsuspendInterval = null;
    }
  }

  async getStats(): Promise<DashboardStats> {
    // Get total active listings (APPROVED status)
    const totalActiveListings = await this.prisma.parkingLocation.count({
      where: { status: LocationStatus.APPROVED },
    });

    // Get current active reservations
    const currentActiveReservations = await this.prisma.reservation.count({
      where: {
        status: {
          in: [
            ReservationStatus.PENDING,
            ReservationStatus.CONFIRMED,
            ReservationStatus.ACTIVE,
          ],
        },
      },
    });

    // Get total users count
    const totalUsers = await this.prisma.user.count();

    // Get current month's start date
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    // Get total revenue this month (sum of completed reservations)
    const revenueData = await this.prisma.reservation.aggregate({
      where: {
        status: ReservationStatus.COMPLETED,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: {
        totalAmount: true,
      },
    });

    const totalRevenueThisMonth = revenueData._sum.totalAmount
      ? parseFloat(revenueData._sum.totalAmount.toString())
      : 0;

    return {
      totalActiveListings,
      currentActiveReservations,
      totalUsers,
      totalRevenueThisMonth,
    };
  }

  async getRecentListings(limit: number = 5): Promise<RecentListing[]> {
    const listings = await this.prisma.parkingLocation.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        host: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return listings.map((listing) => {
      const user = listing.host?.user;
      const hostName = user
        ? user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.email
        : 'Unknown Host';

      return {
        id: listing.id,
        title: listing.title,
        address: listing.address,
        latitude: parseFloat(listing.latitude.toString()),
        longitude: parseFloat(listing.longitude.toString()),
        allowParkAnywhere: listing.allowParkAnywhere,
        hostName,
        status: listing.status,
        createdAt: listing.createdAt,
      };
    });
  }

  async getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
    const activities: RecentActivity[] = [];

    // Get recent listings
    const recentListings = await this.prisma.parkingLocation.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: {
        host: {
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });

    for (const listing of recentListings) {
      const user = listing.host?.user;
      const userName = user
        ? user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName.charAt(0)}.`
          : user.email?.split('@')[0] || 'Unknown'
        : 'Unknown';

      activities.push({
        id: listing.id,
        user: `User "${userName}"`,
        action: 'submitted a new listing.',
        time: listing.createdAt,
      });
    }

    // Get recent completed reservations
    const recentReservations = await this.prisma.reservation.findMany({
      take: 3,
      where: { status: ReservationStatus.COMPLETED },
      orderBy: { createdAt: 'desc' },
      include: {
        driver: {
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });

    for (const reservation of recentReservations) {
      const user = reservation.driver?.user;
      const userName = user
        ? user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName.charAt(0)}.`
          : user.email?.split('@')[0] || 'Unknown'
        : 'Unknown';

      activities.push({
        id: reservation.id,
        user: `Reservation #${reservation.id.slice(0, 8)}`,
        action: `completed by ${userName}.`,
        time: reservation.createdAt,
      });
    }

    // Get recent new users (drivers)
    const recentDrivers = await this.prisma.driver.findMany({
      take: 2,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    for (const driver of recentDrivers) {
      const user = driver.user;
      const userName = user
        ? user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName.charAt(0)}.`
          : user.email?.split('@')[0] || 'Unknown'
        : 'Unknown';

      activities.push({
        id: driver.id,
        user: `User "${userName}"`,
        action: 'registered as a new driver.',
        time: driver.createdAt,
      });
    }

    // Sort all activities by time (most recent first)
    activities.sort((a, b) => b.time.getTime() - a.time.getTime());

    return activities.slice(0, limit);
  }

  async getFinancialStats(
    startDate?: Date,
    endDate?: Date,
  ): Promise<FinancialStats> {
    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const end =
      endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Previous period for comparison
    const periodLength = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - periodLength);
    const prevEnd = new Date(start.getTime() - 1);

    // Get total revenue, platformFee, hostPayoutAmount this period (completed reservations)
    const [
      currentRevenue,
      previousRevenue,
      currentPlatformFees,
      currentHostPayouts,
      pendingPayoutsData,
    ] = await Promise.all([
      this.prisma.reservation.aggregate({
        where: {
          status: ReservationStatus.COMPLETED,
          createdAt: { gte: start, lte: end },
        },
        _sum: { totalAmount: true },
        _avg: { commissionRate: true },
      }),
      this.prisma.reservation.aggregate({
        where: {
          status: ReservationStatus.COMPLETED,
          createdAt: { gte: prevStart, lte: prevEnd },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.reservation.aggregate({
        where: {
          status: ReservationStatus.COMPLETED,
          createdAt: { gte: start, lte: end },
          platformFee: { not: null },
        },
        _sum: { platformFee: true },
      }),
      this.prisma.reservation.aggregate({
        where: {
          status: ReservationStatus.COMPLETED,
          createdAt: { gte: start, lte: end },
          hostPayoutAmount: { not: null },
        },
        _sum: { hostPayoutAmount: true },
      }),
      this.prisma.reservation.aggregate({
        where: {
          status: ReservationStatus.COMPLETED,
          payments: {
            some: {
              status: PaymentStatus.PENDING,
            },
          },
        },
        _sum: { hostPayoutAmount: true, totalAmount: true },
      }),
    ]);

    const totalRevenue = currentRevenue._sum.totalAmount
      ? parseFloat(currentRevenue._sum.totalAmount.toString())
      : 0;

    const prevRevenueAmount = previousRevenue._sum.totalAmount
      ? parseFloat(previousRevenue._sum.totalAmount.toString())
      : 0;

    const commissionRate = currentRevenue._avg.commissionRate
      ? parseFloat(currentRevenue._avg.commissionRate.toString())
      : 0.1;

    // Use actual platformFee if available, fall back to calculated
    const totalPlatformFee = currentPlatformFees._sum.platformFee
      ? parseFloat(currentPlatformFees._sum.platformFee.toString())
      : totalRevenue * commissionRate;

    const totalHostPayout = currentHostPayouts._sum.hostPayoutAmount
      ? parseFloat(currentHostPayouts._sum.hostPayoutAmount.toString())
      : totalRevenue * (1 - commissionRate);

    // Keep totalCommission as alias for platformFee for backward compat
    const totalCommission = totalPlatformFee;
    const prevCommission = prevRevenueAmount * commissionRate;

    // Calculate percentage changes
    const revenueChange =
      prevRevenueAmount > 0
        ? Math.round(
            ((totalRevenue - prevRevenueAmount) / prevRevenueAmount) * 100,
          )
        : totalRevenue > 0
          ? 100
          : 0;

    const commissionChange =
      prevCommission > 0
        ? Math.round(
            ((totalCommission - prevCommission) / prevCommission) * 100,
          )
        : totalCommission > 0
          ? 100
          : 0;

    // Pending payouts: use actual hostPayoutAmount if available, else calculated
    const pendingPayouts = pendingPayoutsData._sum.hostPayoutAmount
      ? parseFloat(pendingPayoutsData._sum.hostPayoutAmount.toString())
      : pendingPayoutsData._sum.totalAmount
        ? parseFloat(pendingPayoutsData._sum.totalAmount.toString()) *
          (1 - commissionRate)
        : 0;

    return {
      totalRevenue,
      totalCommission,
      totalPlatformFee,
      totalHostPayout,
      commissionRate,
      pendingPayouts,
      revenueChange,
      commissionChange,
    };
  }

  async getRecentTransactions(
    limit: number = 10,
    actorType: TransactionActorType = 'ALL',
    includeAll: boolean = false,
    startDate?: Date,
    endDate?: Date,
  ): Promise<RecentTransaction[]> {
    const roleFilter =
      actorType === 'ALL'
        ? undefined
        : {
            some: {
              role: {
                name: actorType,
              },
            },
          };

    const dateFilter =
      startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {};

    const transactions = await this.prisma.walletTransaction.findMany({
      ...(includeAll ? {} : { take: limit }),
      where: {
        ...dateFilter,
        wallet: {
          user: {
            ...(roleFilter ? { userRoles: roleFilter } : {}),
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        wallet: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                userRoles: {
                  include: {
                    role: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return transactions.map((transaction, index) => {
      const user = transaction.wallet.user;
      const userName =
        user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.email.split('@')[0];

      const roles = user.userRoles.map((ur) => ur.role.name);
      let userRole = 'User';

      if (roles.includes('HOST') && !roles.includes('DRIVER')) {
        userRole = 'Host';
      } else if (roles.includes('DRIVER') && !roles.includes('HOST')) {
        userRole = 'Driver';
      } else if (roles.includes('HOST') && roles.includes('DRIVER')) {
        userRole = transaction.source === 'HOST_PAYOUT' ? 'Host' : 'Driver';
      }

      return {
        id: transaction.id || `TRX-${String(index + 1).padStart(3, '0')}`,
        userName,
        userRole,
        email: user.email,
        status: transaction.source,
        amount: parseFloat(transaction.amount.toString()),
        createdAt: transaction.createdAt,
      };
    });
  }

  async getRevenueTrend(
    startDate?: Date,
    endDate?: Date,
  ): Promise<RevenueTrendPoint[]> {
    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const end =
      endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const reservations = await this.prisma.reservation.findMany({
      where: {
        status: ReservationStatus.COMPLETED,
        createdAt: { gte: start, lte: end },
      },
      select: {
        totalAmount: true,
        platformFee: true,
        hostPayoutAmount: true,
        commissionRate: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const dailyData: Record<
      string,
      {
        revenue: number;
        platformFee: number;
        hostPayout: number;
        commissionRate: number;
      }
    > = {};

    for (const res of reservations) {
      const dateKey = res.createdAt.toISOString().split('T')[0];
      const amount = parseFloat(res.totalAmount.toString());
      const rate = res.commissionRate
        ? parseFloat(res.commissionRate.toString())
        : 0.1;
      const platformFee = res.platformFee
        ? parseFloat(res.platformFee.toString())
        : amount * rate;
      const hostPayout = res.hostPayoutAmount
        ? parseFloat(res.hostPayoutAmount.toString())
        : amount * (1 - rate);

      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          revenue: 0,
          platformFee: 0,
          hostPayout: 0,
          commissionRate: rate,
        };
      }
      dailyData[dateKey].revenue += amount;
      dailyData[dateKey].platformFee += platformFee;
      dailyData[dateKey].hostPayout += hostPayout;
    }

    // Fill in missing dates
    const result: RevenueTrendPoint[] = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const day = dailyData[dateKey];
      const revenue = day?.revenue || 0;
      const commission = day?.platformFee || revenue * 0.1;
      const platformFee = day?.platformFee || revenue * 0.1;
      const hostPayout = day?.hostPayout || revenue * 0.9;

      result.push({
        date: dateKey,
        revenue,
        commission,
        platformFee,
        hostPayout,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  async getReservationStats(): Promise<ReservationStats> {
    const [total, active, completed, cancelled] = await Promise.all([
      this.prisma.reservation.count(),
      this.prisma.reservation.count({
        where: {
          status: {
            in: [
              ReservationStatus.PENDING,
              ReservationStatus.CONFIRMED,
              ReservationStatus.ACTIVE,
            ],
          },
        },
      }),
      this.prisma.reservation.count({
        where: { status: ReservationStatus.COMPLETED },
      }),
      this.prisma.reservation.count({
        where: { status: ReservationStatus.CANCELLED },
      }),
    ]);

    return {
      totalReservations: total,
      activeReservations: active,
      completedReservations: completed,
      cancelledReservations: cancelled,
    };
  }

  async getReservations(
    page: number = 1,
    limit: number = 10,
    status?: ReservationStatus,
    search?: string,
  ): Promise<{ reservations: ReservationListItem[]; total: number }> {
    const skip = (page - 1) * limit;
    const isUuidSearch =
      !!search &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        search,
      );

    const where: Prisma.ReservationWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        ...(isUuidSearch ? [{ id: search }] : []),
        {
          driver: {
            user: {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
        {
          parkingSpace: {
            parkingLocation: {
              title: { contains: search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const [reservations, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          driver: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                  profilePicture: true,
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
                          firstName: true,
                          lastName: true,
                          email: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.reservation.count({ where }),
    ]);

    return {
      reservations: reservations.map((res) => {
        const driverUser = res.driver.user;
        const guestName =
          driverUser.firstName && driverUser.lastName
            ? `${driverUser.firstName} ${driverUser.lastName}`
            : driverUser.email;

        const hostUser = res.parkingSpace.parkingLocation.host.user;
        const hostName =
          hostUser.firstName && hostUser.lastName
            ? `${hostUser.firstName} ${hostUser.lastName}`
            : hostUser.email;

        return {
          id: res.id,
          guestName,
          guestProfilePicture: driverUser.profilePicture,
          hostName,
          propertyTitle: res.parkingSpace.parkingLocation.title,
          arrivalDeadline: res.arrivalDeadline,
          sessionStartedAt: res.sessionStartedAt,
          sessionEndedAt: res.sessionEndedAt,
          status: res.status,
          totalAmount: parseFloat(res.totalAmount.toString()),
          cancelledBy: res.cancelledBy ?? null,
          cancellationReason: res.cancellationReason ?? null,
        };
      }),
      total,
    };
  }

  async getReservationById(id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        driver: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true,
                profilePicture: true,
              },
            },
            vehicles: true,
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
                        firstName: true,
                        lastName: true,
                        email: true,
                        phoneNumber: true,
                        profilePicture: true,
                      },
                    },
                  },
                },
                images: true,
              },
            },
          },
        },
        payments: true,
        reviews: true,
      },
    });

    if (!reservation) {
      return null;
    }

    const driverUser = reservation.driver.user;
    const hostUser = reservation.parkingSpace.parkingLocation.host.user;

    return {
      id: reservation.id,
      status: reservation.status,
      arrivalDeadline: reservation.arrivalDeadline,
      sessionStartedAt: reservation.sessionStartedAt,
      sessionEndedAt: reservation.sessionEndedAt,
      totalAmount: parseFloat(reservation.totalAmount.toString()),
      qrCode: reservation.qrCode,
      createdAt: reservation.createdAt,
      guest: {
        id: driverUser.id,
        name:
          driverUser.firstName && driverUser.lastName
            ? `${driverUser.firstName} ${driverUser.lastName}`
            : driverUser.email,
        email: driverUser.email,
        phone: driverUser.phoneNumber,
        profilePicture: driverUser.profilePicture,
      },
      host: {
        id: hostUser.id,
        name:
          hostUser.firstName && hostUser.lastName
            ? `${hostUser.firstName} ${hostUser.lastName}`
            : hostUser.email,
        email: hostUser.email,
        phone: hostUser.phoneNumber,
        profilePicture: hostUser.profilePicture,
      },
      property: {
        id: reservation.parkingSpace.parkingLocation.id,
        title: reservation.parkingSpace.parkingLocation.title,
        address: reservation.parkingSpace.parkingLocation.address,
        slotNumber: reservation.parkingSpace.slotNumber,
        images: reservation.parkingSpace.parkingLocation.images.map(
          (img) => img.imageUrl,
        ),
      },
      payments: reservation.payments.map((p) => ({
        id: p.id,
        amount: parseFloat(p.amount.toString()),
        method: p.paymentMethod,
        status: p.status,
        createdAt: p.createdAt,
      })),
      reviews: reservation.reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
      })),
      cancelledBy: reservation.cancelledBy ?? null,
      cancellationReason: reservation.cancellationReason ?? null,
      hostPayoutAmount: reservation.hostPayoutAmount
        ? parseFloat(reservation.hostPayoutAmount.toString())
        : null,
      hostPayoutSettled: !!reservation.hostPayoutId,
      driverRefundAmount: parseFloat(reservation.totalAmount.toString()),
      driverRefunded: !!reservation.driverRefundId,
    };
  }

  async adminCancelReservation(id: string, reason?: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        parkingSpace: {
          include: {
            parkingLocation: {
              include: { host: true },
            },
          },
        },
        driver: {
          include: { user: true },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (['CANCELLED', 'EXPIRED', 'COMPLETED'].includes(reservation.status)) {
      throw new BadRequestException(
        `Cannot cancel a reservation with status: ${reservation.status}`,
      );
    }

    const wasActive = reservation.status === 'ACTIVE';
    const now = new Date();

    // Calculate pro-rated amounts for active sessions
    let finalAmount = new Decimal(0);
    let platformFee = new Decimal(0);
    let hostPayoutAmount = new Decimal(0);

    if (wasActive && reservation.sessionStartedAt) {
      const sessionStart = new Date(reservation.sessionStartedAt);
      const pricePerHour = new Decimal(
        reservation.parkingSpace.parkingLocation.basePricePerHour,
      );
      const durationMs = now.getTime() - sessionStart.getTime();
      const durationHours = Math.max(
        1,
        Math.ceil(durationMs / (1000 * 60 * 60)),
      );

      finalAmount = pricePerHour.mul(durationHours);
      platformFee = finalAmount
        .mul(this.PLATFORM_COMMISSION_RATE)
        .toDecimalPlaces(2);
      hostPayoutAmount = Decimal.max(
        finalAmount.sub(platformFee),
        0,
      ).toDecimalPlaces(2);
    }

    // Perform the cancellation in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // If PENDING, refund escrow to driver wallet
      if (reservation.status === 'PENDING' && reservation.escrowAmount) {
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

      // Free up the parking space
      await tx.parkingSpace.update({
        where: { id: reservation.parkingSpaceId },
        data: { status: 'AVAILABLE' },
      });

      // Sync available slot count
      const space = await tx.parkingSpace.findUnique({
        where: { id: reservation.parkingSpaceId },
        select: { parkingLocationId: true },
      });
      if (space) {
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

      // Update the reservation
      return tx.reservation.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledBy: 'ADMIN',
          cancellationReason: reason || null,
          sessionEndedAt: wasActive ? now : undefined,
          escrowAmount: reservation.status === 'PENDING' ? 0 : undefined,
          ...(wasActive
            ? {
                finalAmount,
                platformFee,
                hostPayoutAmount,
              }
            : {}),
        },
      });
    });

    // Send notifications to driver and host
    const driverUserId = reservation.driver.userId;
    const hostUserId = reservation.parkingSpace.parkingLocation.host.userId;
    const locationTitle = reservation.parkingSpace.parkingLocation.title;

    this.notificationsService
      .notifyBookingCancelledByAdmin(
        driverUserId,
        hostUserId,
        id,
        locationTitle,
        reason,
      )
      .catch(() => {});

    // Emit real-time socket events for instant mobile UI updates
    const socketPayload = { reservationId: id, cancelledBy: 'admin', reason };
    this.notificationsGateway.sendReservationCancelled(
      driverUserId,
      socketPayload,
    );
    this.notificationsGateway.sendReservationCancelled(
      hostUserId,
      socketPayload,
    );

    return {
      success: true,
      message: 'Reservation cancelled by admin.',
      reservation: {
        id: result.id,
        status: result.status,
        cancelledBy: 'ADMIN',
        cancellationReason: reason || null,
      },
      ...(wasActive
        ? {
            settlement: {
              finalAmount: finalAmount.toFixed(2),
              platformFee: platformFee.toFixed(2),
              hostPayoutAmount: hostPayoutAmount.toFixed(2),
              note: 'Host payout pending admin settlement.',
            },
          }
        : {}),
    };
  }

  /**
   * Admin: Settle host payout for an admin-cancelled active session
   */
  async adminSettleHostPayout(reservationId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        parkingSpace: {
          include: {
            parkingLocation: { include: { host: true } },
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (
      reservation.status !== 'CANCELLED' ||
      reservation.cancelledBy !== 'ADMIN'
    ) {
      throw new BadRequestException(
        'Can only settle payouts for admin-cancelled reservations',
      );
    }

    if (reservation.hostPayoutId) {
      throw new BadRequestException('Host payout has already been settled');
    }

    const hostPayoutAmount = new Decimal(
      String(reservation.hostPayoutAmount ?? 0),
    );
    if (hostPayoutAmount.lte(0)) {
      throw new BadRequestException('No host payout amount to settle');
    }

    const hostUserId = reservation.parkingSpace.parkingLocation.host.userId;

    await this.prisma.$transaction(async (tx) => {
      const hostWallet = await tx.wallet.findUnique({
        where: { userId: hostUserId },
      });

      if (!hostWallet) {
        throw new BadRequestException('Host wallet not found');
      }

      const payoutTx = await tx.walletTransaction.create({
        data: {
          walletId: hostWallet.id,
          type: 'CREDIT',
          source: 'BOOKING_PAYOUT',
          amount: hostPayoutAmount,
          referenceId: reservationId,
          balanceBefore: hostWallet.balance,
          balanceAfter: new Decimal(hostWallet.balance).add(hostPayoutAmount),
        },
      });

      await tx.wallet.update({
        where: { id: hostWallet.id },
        data: {
          balance: { increment: hostPayoutAmount.toNumber() },
        },
      });

      await tx.reservation.update({
        where: { id: reservationId },
        data: { hostPayoutId: payoutTx.id },
      });
    });

    // Notify host of payout
    const locationTitle = reservation.parkingSpace.parkingLocation.title;
    this.notificationsService
      .send({
        userId: hostUserId,
        title: 'Payout Settled',
        message: `Your payout of ₱${hostPayoutAmount.toFixed(2)} for the cancelled session at ${locationTitle} has been released to your wallet.`,
        type: 'GENERAL',
        data: { reservationId },
      })
      .catch(() => {});

    // Emit balance update
    const updatedWallet = await this.prisma.wallet.findUnique({
      where: { userId: hostUserId },
    });
    if (updatedWallet) {
      this.notificationsGateway.sendBalanceUpdate(
        hostUserId,
        updatedWallet.balance.toString(),
      );
    }

    return {
      success: true,
      message: `Host payout of ₱${hostPayoutAmount.toFixed(2)} settled successfully.`,
    };
  }

  /**
   * Admin: Refund the driver's escrow/payment for an admin-cancelled reservation
   */
  async adminRefundDriver(reservationId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        driver: {
          include: { user: true },
        },
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

    if (
      reservation.status !== 'CANCELLED' ||
      reservation.cancelledBy !== 'ADMIN'
    ) {
      throw new BadRequestException(
        'Can only refund drivers for admin-cancelled reservations',
      );
    }

    if (reservation.driverRefundId) {
      throw new BadRequestException('Driver has already been refunded');
    }

    // Refund the escrow (first hour) that was charged
    const refundAmount = new Decimal(String(reservation.totalAmount ?? 0));
    if (refundAmount.lte(0)) {
      throw new BadRequestException('No amount to refund');
    }

    const driverUserId = reservation.driver.userId;

    await this.prisma.$transaction(async (tx) => {
      const driverWallet = await tx.wallet.findUnique({
        where: { userId: driverUserId },
      });

      if (!driverWallet) {
        throw new BadRequestException('Driver wallet not found');
      }

      const refundTx = await tx.walletTransaction.create({
        data: {
          walletId: driverWallet.id,
          type: 'CREDIT',
          source: 'REFUND',
          amount: refundAmount,
          referenceId: reservationId,
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

      await tx.reservation.update({
        where: { id: reservationId },
        data: { driverRefundId: refundTx.id },
      });
    });

    // Notify driver of refund
    const locationTitle = reservation.parkingSpace.parkingLocation.title;
    this.notificationsService
      .send({
        userId: driverUserId,
        title: 'Refund Issued',
        message: `You have been refunded ₱${refundAmount.toFixed(2)} for the cancelled session at ${locationTitle}.`,
        type: 'GENERAL',
        data: { reservationId, screen: 'payment' },
      })
      .catch(() => {});

    // Emit balance update
    const updatedWallet = await this.prisma.wallet.findUnique({
      where: { userId: driverUserId },
    });
    if (updatedWallet) {
      this.notificationsGateway.sendBalanceUpdate(
        driverUserId,
        updatedWallet.balance.toString(),
      );
    }

    return {
      success: true,
      message: `Driver refunded ₱${refundAmount.toFixed(2)} successfully.`,
    };
  }

  async getFlaggedUsers() {
    const [driverResults, hostResults] = await Promise.all([
      // Drivers with avg HOST_TO_DRIVER rating < 2.5 and >= 10 reviews
      this.prisma.driver.findMany({
        where: {
          reservations: {
            some: {
              reviews: { some: { reviewType: 'HOST_TO_DRIVER' } },
            },
          },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              userRoles: {
                where: { role: { name: 'DRIVER' } },
                select: {
                  roleId: true,
                  status: true,
                  suspendedAt: true,
                  suspendUntil: true,
                  suspensionReason: true,
                },
              },
            },
          },
          reservations: {
            select: {
              reviews: {
                where: { reviewType: 'HOST_TO_DRIVER' },
                select: { rating: true, comment: true, createdAt: true },
              },
            },
          },
        },
      }),
      // Hosts with avg DRIVER_TO_LOCATION rating < 2.5 and >= 10 reviews
      this.prisma.host.findMany({
        where: {
          parkingLocations: {
            some: {
              parkingSpaces: {
                some: {
                  reservations: {
                    some: {
                      reviews: { some: { reviewType: 'DRIVER_TO_LOCATION' } },
                    },
                  },
                },
              },
            },
          },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              userRoles: {
                where: { role: { name: 'HOST' } },
                select: {
                  roleId: true,
                  status: true,
                  suspendedAt: true,
                  suspendUntil: true,
                  suspensionReason: true,
                },
              },
            },
          },
          parkingLocations: {
            select: {
              parkingSpaces: {
                select: {
                  reservations: {
                    select: {
                      reviews: {
                        where: { reviewType: 'DRIVER_TO_LOCATION' },
                        select: {
                          rating: true,
                          comment: true,
                          createdAt: true,
                          reviewer: {
                            select: { firstName: true, lastName: true },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const flagged: {
      userId: string;
      name: string;
      email: string;
      role: string;
      roleId: string | null;
      averageRating: number;
      totalReviews: number;
      currentStatus: string | null;
      suspendedAt: Date | null;
      suspendUntil: Date | null;
      suspensionReason: string | null;
      recentReviews: {
        rating: number;
        comment: string | null;
        createdAt: Date;
        reviewer?: { firstName: string | null; lastName: string | null };
      }[];
    }[] = [];

    for (const driver of driverResults) {
      const allReviews = driver.reservations.flatMap((r) => r.reviews);
      if (allReviews.length < 10) continue;
      const avg =
        allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      if (avg >= 2.5) continue;

      const roleInfo = driver.user.userRoles[0];
      const recent = [...allReviews]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5);

      flagged.push({
        userId: driver.user.id,
        name: `${driver.user.firstName ?? ''} ${driver.user.lastName ?? ''}`.trim(),
        email: driver.user.email,
        role: 'DRIVER',
        roleId: roleInfo?.roleId ?? null,
        averageRating: Math.round(avg * 10) / 10,
        totalReviews: allReviews.length,
        currentStatus: roleInfo?.status ?? null,
        suspendedAt: roleInfo?.suspendedAt ?? null,
        suspendUntil: roleInfo?.suspendUntil ?? null,
        suspensionReason: roleInfo?.suspensionReason ?? null,
        recentReviews: recent,
      });
    }

    for (const host of hostResults) {
      const allReviews = host.parkingLocations
        .flatMap((loc) => loc.parkingSpaces)
        .flatMap((space) => space.reservations)
        .flatMap((res) => res.reviews);

      if (allReviews.length < 10) continue;
      const avg =
        allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      if (avg >= 2.5) continue;

      const roleInfo = host.user.userRoles[0];
      const recent = [...allReviews]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5);

      flagged.push({
        userId: host.user.id,
        name: `${host.user.firstName ?? ''} ${host.user.lastName ?? ''}`.trim(),
        email: host.user.email,
        role: 'HOST',
        roleId: roleInfo?.roleId ?? null,
        averageRating: Math.round(avg * 10) / 10,
        totalReviews: allReviews.length,
        currentStatus: roleInfo?.status ?? null,
        suspendedAt: roleInfo?.suspendedAt ?? null,
        suspendUntil: roleInfo?.suspendUntil ?? null,
        suspensionReason: roleInfo?.suspensionReason ?? null,
        recentReviews: recent,
      });
    }

    return flagged;
  }

  async warnUser(userId: string, roleId: string, message?: string) {
    const userRole = await this.prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId } },
      include: { role: { select: { name: true } } },
    });
    if (!userRole) {
      throw new NotFoundException('User role not found');
    }

    const roleName = userRole.role.name.toLowerCase();
    const body =
      message ??
      `Your ${roleName} account has received a warning due to low ratings. Please improve your service to avoid suspension.`;

    await this.notificationsService.send({
      userId,
      title: 'Account Warning',
      message: body,
      type: NotificationType.USER_WARNING,
      data: { roleId, role: userRole.role.name },
    });

    return { success: true, message: 'Warning sent.' };
  }

  async suspendUser(
    userId: string,
    roleId: string,
    days: number,
    reason: string,
  ) {
    const userRole = await this.prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId } },
      include: { role: { select: { name: true } } },
    });
    if (!userRole) {
      throw new NotFoundException('User role not found');
    }

    const now = new Date();
    const suspendUntil = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    await this.prisma.userRole.update({
      where: { userId_roleId: { userId, roleId } },
      data: {
        status: 'SUSPENDED',
        suspendedAt: now,
        suspendUntil,
        suspensionReason: reason,
      },
    });

    const roleName = userRole.role.name.toLowerCase();
    await this.notificationsService.send({
      userId,
      title: 'Account Suspended',
      message: `Your ${roleName} account has been suspended for ${days} day${days === 1 ? '' : 's'}. Reason: ${reason}`,
      type: NotificationType.USER_SUSPENDED,
      data: { roleId, role: userRole.role.name, days, reason, suspendUntil },
    });

    return {
      success: true,
      message: `User suspended until ${suspendUntil.toISOString()}.`,
    };
  }

  async unsuspendUser(userId: string, roleId: string) {
    const userRole = await this.prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId } },
      include: { role: { select: { name: true } } },
    });
    if (!userRole) {
      throw new NotFoundException('User role not found');
    }

    await this.prisma.userRole.update({
      where: { userId_roleId: { userId, roleId } },
      data: {
        status: 'VERIFIED',
        suspendedAt: null,
        suspendUntil: null,
        suspensionReason: null,
      },
    });

    const roleName = userRole.role.name.toLowerCase();
    await this.notificationsService.send({
      userId,
      title: 'Account Reactivated',
      message: `Your ${roleName} account has been reactivated.`,
      type: NotificationType.USER_UNSUSPENDED,
      data: { roleId, role: userRole.role.name },
    });

    return { success: true, message: 'User unsuspended successfully.' };
  }

  async autoUnsuspendExpired() {
    const now = new Date();
    const expired = await this.prisma.userRole.findMany({
      where: {
        status: 'SUSPENDED',
        suspendUntil: { lte: now },
      },
      include: { role: { select: { name: true } } },
    });

    if (expired.length === 0) return;

    await Promise.all(
      expired.map(async (ur) => {
        await this.prisma.userRole.update({
          where: { userId_roleId: { userId: ur.userId, roleId: ur.roleId } },
          data: {
            status: 'VERIFIED',
            suspendedAt: null,
            suspendUntil: null,
            suspensionReason: null,
          },
        });

        const roleName = ur.role.name.toLowerCase();
        await this.notificationsService.send({
          userId: ur.userId,
          title: 'Account Reactivated',
          message: `Your ${roleName} account suspension has expired and your account has been reactivated.`,
          type: NotificationType.USER_UNSUSPENDED,
          data: { role: ur.role.name },
        });
      }),
    );
  }
}
