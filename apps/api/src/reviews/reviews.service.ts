import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, ReviewType, RoleName } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async createDriverReview(userId: string, dto: CreateReviewDto) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
    });
    if (!driver) {
      throw new ForbiddenException('Driver profile not found');
    }

    const reservation = await this.prisma.reservation.findUnique({
      where: { id: dto.reservationId },
      include: {
        parkingSpace: {
          include: {
            parkingLocation: { include: { host: { select: { userId: true } } } },
          },
        },
      },
    });
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }
    if (reservation.driverId !== driver.id) {
      throw new ForbiddenException('This is not your reservation');
    }
    if (reservation.status !== 'COMPLETED') {
      throw new BadRequestException(
        'You can only review completed reservations',
      );
    }

    const existing = await this.prisma.review.findUnique({
      where: {
        reservationId_reviewType: {
          reservationId: dto.reservationId,
          reviewType: ReviewType.DRIVER_TO_LOCATION,
        },
      },
    });
    if (existing) {
      throw new BadRequestException(
        'You have already reviewed this reservation',
      );
    }

    const review = await this.prisma.review.create({
      data: {
        reservationId: dto.reservationId,
        reviewerId: userId,
        reviewType: ReviewType.DRIVER_TO_LOCATION,
        rating: dto.rating,
        comment: dto.comment,
      },
      include: {
        reviewer: {
          select: { firstName: true, lastName: true, profilePicture: true },
        },
      },
    });

    await this.checkAndFlagLowRating(
      reservation.parkingSpace.parkingLocation.host.userId,
      RoleName.HOST,
    );

    return review;
  }

  async createHostReview(userId: string, dto: CreateReviewDto) {
    const host = await this.prisma.host.findUnique({
      where: { userId },
    });
    if (!host) {
      throw new ForbiddenException('Host profile not found');
    }

    const reservation = await this.prisma.reservation.findUnique({
      where: { id: dto.reservationId },
      include: {
        parkingSpace: { include: { parkingLocation: true } },
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
    if (reservation.status !== 'COMPLETED') {
      throw new BadRequestException(
        'You can only review completed reservations',
      );
    }

    const existing = await this.prisma.review.findUnique({
      where: {
        reservationId_reviewType: {
          reservationId: dto.reservationId,
          reviewType: ReviewType.HOST_TO_DRIVER,
        },
      },
    });
    if (existing) {
      throw new BadRequestException(
        'You have already reviewed this driver for this reservation',
      );
    }

    const review = await this.prisma.review.create({
      data: {
        reservationId: dto.reservationId,
        reviewerId: userId,
        reviewType: ReviewType.HOST_TO_DRIVER,
        rating: dto.rating,
        comment: dto.comment,
      },
      include: {
        reviewer: {
          select: { firstName: true, lastName: true, profilePicture: true },
        },
      },
    });

    // Get the driver's userId from the reservation and check for low rating flag
    const driverRecord = await this.prisma.driver.findUnique({
      where: { id: reservation.driverId },
      select: { userId: true },
    });
    if (driverRecord) {
      await this.checkAndFlagLowRating(driverRecord.userId, RoleName.DRIVER);
    }

    return review;
  }

  private async checkAndFlagLowRating(userId: string, role: RoleName) {
    const MIN_REVIEWS = 10;
    const RATING_THRESHOLD = 2.5;
    const FLAG_COOLDOWN_DAYS = 7;

    let totalReviews: number;
    let avgRating: number;

    if (role === RoleName.DRIVER) {
      const driver = await this.prisma.driver.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!driver) return;

      const result = await this.prisma.review.aggregate({
        where: {
          reviewType: ReviewType.HOST_TO_DRIVER,
          reservation: { driverId: driver.id },
        },
        _avg: { rating: true },
        _count: true,
      });
      totalReviews = result._count;
      avgRating = Number(result._avg.rating ?? 0);
    } else {
      const host = await this.prisma.host.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!host) return;

      const result = await this.prisma.review.aggregate({
        where: {
          reviewType: ReviewType.DRIVER_TO_LOCATION,
          reservation: {
            parkingSpace: {
              parkingLocation: { hostId: host.id },
            },
          },
        },
        _avg: { rating: true },
        _count: true,
      });
      totalReviews = result._count;
      avgRating = Number(result._avg.rating ?? 0);
    }

    if (totalReviews < MIN_REVIEWS) return;
    if (avgRating >= RATING_THRESHOLD) return;

    // Debounce: skip if already flagged within last 7 days
    // LOW_RATING_FLAGGED notifications are sent to admins, so we query by data.flaggedUserId
    const cooldownDate = new Date();
    cooldownDate.setDate(cooldownDate.getDate() - FLAG_COOLDOWN_DAYS);
    const recentFlag = await this.prisma.notification.findFirst({
      where: {
        type: NotificationType.LOW_RATING_FLAGGED,
        createdAt: { gte: cooldownDate },
        data: { path: ['flaggedUserId'], equals: userId },
      },
    });
    if (recentFlag) return;

    // Fetch user name for the notification message
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    const userName = user
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
      : 'Unknown User';

    // Notify all admins
    const adminRole = await this.prisma.role.findUnique({
      where: { name: RoleName.ADMIN },
    });
    if (!adminRole) return;

    const admins = await this.prisma.userRole.findMany({
      where: { roleId: adminRole.id, status: 'VERIFIED' },
      select: { userId: true },
    });

    await Promise.all(
      admins.map((admin) =>
        this.notificationsService.send({
          userId: admin.userId,
          title: 'Low Rating Flagged',
          message: `${userName} (${role}) has an average rating of ${avgRating.toFixed(1)} across ${totalReviews} reviews.`,
          type: NotificationType.LOW_RATING_FLAGGED,
          data: {
            flaggedUserId: userId,
            role,
            averageRating: avgRating,
            totalReviews,
            userName,
          },
        }),
      ),
    );
  }

  async getReviewsForLocation(locationId: string) {
    return this.prisma.review.findMany({
      where: {
        reviewType: ReviewType.DRIVER_TO_LOCATION,
        reservation: {
          parkingSpace: { parkingLocationId: locationId },
        },
      },
      include: {
        reviewer: {
          select: { firstName: true, lastName: true, profilePicture: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getReviewsForDriver(driverId: string) {
    return this.prisma.review.findMany({
      where: {
        reviewType: ReviewType.HOST_TO_DRIVER,
        reservation: { driverId },
      },
      include: {
        reviewer: {
          select: { firstName: true, lastName: true, profilePicture: true },
        },
        reservation: {
          select: {
            parkingSpace: {
              select: {
                parkingLocation: { select: { title: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getReviewsForReservation(reservationId: string) {
    return this.prisma.review.findMany({
      where: { reservationId },
      include: {
        reviewer: {
          select: { firstName: true, lastName: true, profilePicture: true },
        },
      },
    });
  }

  async getAllReviewsAdmin(params: {
    page: number;
    limit: number;
    type?: string;
    search?: string;
  }) {
    const { page, limit, type, search } = params;
    const skip = (page - 1) * limit;

    const validType =
      type === 'DRIVER_TO_LOCATION' || type === 'HOST_TO_DRIVER'
        ? (type as ReviewType)
        : undefined;

    const where = {
      ...(validType ? { reviewType: validType } : {}),
      ...(search
        ? {
            OR: [
              {
                reviewer: {
                  firstName: { contains: search, mode: 'insensitive' as const },
                },
              },
              {
                reviewer: {
                  lastName: { contains: search, mode: 'insensitive' as const },
                },
              },
              { comment: { contains: search, mode: 'insensitive' as const } },
              {
                reservation: {
                  parkingSpace: {
                    parkingLocation: {
                      title: { contains: search, mode: 'insensitive' as const },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          reviewer: {
            select: {
              firstName: true,
              lastName: true,
              profilePicture: true,
              email: true,
            },
          },
          reservation: {
            select: {
              parkingSpace: {
                select: {
                  name: true,
                  slotNumber: true,
                  parkingLocation: {
                    select: { title: true, address: true },
                  },
                },
              },
              driver: {
                select: {
                  user: {
                    select: { firstName: true, lastName: true, email: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    return { reviews, total, page, limit };
  }

  async getUserReviewsAdmin(userId: string) {
    const [given, received] = await Promise.all([
      // Reviews this user wrote (as reviewer)
      this.prisma.review.findMany({
        where: { reviewerId: userId },
        include: {
          reservation: {
            select: {
              parkingSpace: {
                select: {
                  parkingLocation: { select: { title: true } },
                },
              },
              driver: {
                select: {
                  user: { select: { firstName: true, lastName: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      // Reviews others wrote about this user (as driver or host's location)
      this.prisma.review.findMany({
        where: {
          OR: [
            // Host-to-driver reviews received by this user as a driver
            {
              reviewType: ReviewType.HOST_TO_DRIVER,
              reservation: { driver: { userId } },
            },
            // Driver-to-location reviews received by this user as a host
            {
              reviewType: ReviewType.DRIVER_TO_LOCATION,
              reservation: {
                parkingSpace: {
                  parkingLocation: { host: { userId } },
                },
              },
            },
          ],
        },
        include: {
          reviewer: {
            select: { firstName: true, lastName: true, profilePicture: true },
          },
          reservation: {
            select: {
              parkingSpace: {
                select: {
                  parkingLocation: { select: { title: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { given, received };
  }

  async deleteReview(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    await this.prisma.review.delete({ where: { id } });
    return { message: 'Review deleted successfully' };
  }

  async getLocationAverageRating(locationId: string) {
    const result = await this.prisma.review.aggregate({
      where: {
        reviewType: ReviewType.DRIVER_TO_LOCATION,
        reservation: {
          parkingSpace: { parkingLocationId: locationId },
        },
      },
      _avg: { rating: true },
      _count: true,
    });

    return {
      averageRating: result._avg?.rating
        ? Math.round(result._avg.rating * 10) / 10
        : null,
      totalReviews: result._count,
    };
  }
}
