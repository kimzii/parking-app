import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  LocationStatus,
  ReservationStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';

export interface DashboardStats {
  totalActiveListings: number;
  currentActiveReservations: number;
  totalUsers: number;
  totalRevenueThisMonth: number;
}

export interface FinancialStats {
  totalRevenue: number;
  totalCommission: number;
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

export interface RevenueTrendPoint {
  date: string;
  revenue: number;
  commission: number;
}

export interface RecentListing {
  id: string;
  title: string;
  address: string;
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
  startTime: Date;
  endTime: Date;
  status: ReservationStatus;
  totalAmount: number;
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(): Promise<DashboardStats> {
    // Get total active listings (APPROVED status)
    const totalActiveListings = await this.prisma.parkingLocation.count({
      where: { status: LocationStatus.APPROVED },
    });

    // Get current active reservations
    const currentActiveReservations = await this.prisma.reservation.count({
      where: {
        status: {
          in: [ReservationStatus.CONFIRMED, ReservationStatus.ACTIVE],
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

    return listings.map((listing) => ({
      id: listing.id,
      title: listing.title,
      address: listing.address,
      hostName:
        listing.host.user.firstName && listing.host.user.lastName
          ? `${listing.host.user.firstName} ${listing.host.user.lastName}`
          : listing.host.user.email,
      status: listing.status,
      createdAt: listing.createdAt,
    }));
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
      const userName =
        listing.host.user.firstName && listing.host.user.lastName
          ? `${listing.host.user.firstName} ${listing.host.user.lastName.charAt(0)}.`
          : listing.host.user.email.split('@')[0];

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
      const userName =
        reservation.driver.user.firstName && reservation.driver.user.lastName
          ? `${reservation.driver.user.firstName} ${reservation.driver.user.lastName.charAt(0)}.`
          : reservation.driver.user.email.split('@')[0];

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
      const userName =
        driver.user.firstName && driver.user.lastName
          ? `${driver.user.firstName} ${driver.user.lastName.charAt(0)}.`
          : driver.user.email.split('@')[0];

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

    // Get total revenue this period (completed reservations)
    const currentRevenue = await this.prisma.reservation.aggregate({
      where: {
        status: ReservationStatus.COMPLETED,
        createdAt: { gte: start, lte: end },
      },
      _sum: { totalAmount: true },
    });

    // Get previous period revenue
    const previousRevenue = await this.prisma.reservation.aggregate({
      where: {
        status: ReservationStatus.COMPLETED,
        createdAt: { gte: prevStart, lte: prevEnd },
      },
      _sum: { totalAmount: true },
    });

    const totalRevenue = currentRevenue._sum.totalAmount
      ? parseFloat(currentRevenue._sum.totalAmount.toString())
      : 0;

    const prevRevenueAmount = previousRevenue._sum.totalAmount
      ? parseFloat(previousRevenue._sum.totalAmount.toString())
      : 0;

    // Commission is 10% of revenue
    const commissionRate = 0.1;
    const totalCommission = totalRevenue * commissionRate;
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

    // Get pending payouts (completed reservations minus commission that haven't been paid out)
    // For simplicity, we'll calculate as revenue from completed reservations where payment is pending
    const pendingPayoutsData = await this.prisma.reservation.aggregate({
      where: {
        status: ReservationStatus.COMPLETED,
        payments: {
          some: {
            status: PaymentStatus.PENDING,
          },
        },
      },
      _sum: { totalAmount: true },
    });

    const pendingPayouts = pendingPayoutsData._sum.totalAmount
      ? parseFloat(pendingPayoutsData._sum.totalAmount.toString()) *
        (1 - commissionRate)
      : 0;

    return {
      totalRevenue,
      totalCommission,
      pendingPayouts,
      revenueChange,
      commissionChange,
    };
  }

  async getRecentTransactions(
    limit: number = 10,
  ): Promise<RecentTransaction[]> {
    // Get recent payments with user info
    const payments = await this.prisma.payment.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        reservation: {
          include: {
            driver: {
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
        },
      },
    });

    return payments.map((payment, index) => {
      const user = payment.reservation.driver.user;
      const userName =
        user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.email.split('@')[0];

      const roles = user.userRoles.map((ur) => ur.role.name);
      const userRole = roles.includes('HOST')
        ? 'Host'
        : roles.includes('DRIVER')
          ? 'Driver'
          : 'User';

      return {
        id: `TRX-${String(index + 1).padStart(3, '0')}`,
        userName,
        userRole,
        email: user.email,
        status: payment.status,
        amount: parseFloat(payment.amount.toString()),
        createdAt: payment.createdAt,
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
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const dailyData: Record<string, number> = {};

    for (const res of reservations) {
      const dateKey = res.createdAt.toISOString().split('T')[0];
      const amount = parseFloat(res.totalAmount.toString());
      dailyData[dateKey] = (dailyData[dateKey] || 0) + amount;
    }

    // Fill in missing dates
    const result: RevenueTrendPoint[] = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const revenue = dailyData[dateKey] || 0;
      const commission = revenue * 0.1;

      result.push({
        date: dateKey,
        revenue,
        commission,
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
            in: [ReservationStatus.ACTIVE, ReservationStatus.CONFIRMED],
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

    const where: Prisma.ReservationWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
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
          startTime: res.startTime,
          endTime: res.endTime,
          status: res.status,
          totalAmount: parseFloat(res.totalAmount.toString()),
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
      startTime: reservation.startTime,
      endTime: reservation.endTime,
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
    };
  }
}
