import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewType } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

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
        parkingSpace: { include: { parkingLocation: true } },
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

    return this.prisma.review.create({
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

    return this.prisma.review.create({
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
