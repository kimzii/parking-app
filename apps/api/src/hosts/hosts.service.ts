import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateParkingLocationDto } from './dto/create-parking-location.dto';
import { UpdateParkingLocationDto } from './dto/update-parking-location.dto';
import { QueryParkingLocationsDto } from './dto/query-parking-locations.dto';
import { UpdateLocationStatusDto } from './dto/update-location-status.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { S3Service } from '../common/s3.service';
import { Prisma, ReviewType, VehicleType } from '@prisma/client';

// Convert level number to letter prefix: 1→"A", 2→"B", ..., 26→"Z", 27→"AA"
function levelToPrefix(level: number): string {
  let result = '';
  let n = level;
  while (n > 0) {
    n--;
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result;
}

function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type BrowseLocationRow = {
  id: string;
  title: string;
  address: string;
  latitude: Prisma.Decimal;
  longitude: Prisma.Decimal;
  basePricePerHour: Prisma.Decimal;
  totalSlots: number | null;
  availableSlots: number | null;
  allowParkAnywhere: boolean;
  acceptedVehicles: VehicleType[];
  openTime: string | null;
  closeTime: string | null;
  is24Hours: boolean;
  images: { imageUrl: string }[];
};

type PublicBrowseLocation = Omit<
  BrowseLocationRow,
  'openTime' | 'closeTime' | 'is24Hours'
>;

@Injectable()
export class HostsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private s3: S3Service,
  ) {}

  private async assertHostNotSuspended(userId: string) {
    const hostRole = await this.prisma.userRole.findFirst({
      where: {
        userId,
        role: {
          name: 'HOST',
        },
      },
      select: {
        status: true,
      },
    });

    if (hostRole?.status === 'SUSPENDED') {
      throw new ForbiddenException(
        'Host parking-space activities are suspended for this account.',
      );
    }
  }

  // Become a host - adds HOST role and creates Host profile
  async becomeHost(userId: string) {
    const existingHostRole = await this.prisma.userRole.findFirst({
      where: {
        userId,
        role: { name: 'HOST' },
      },
    });

    if (existingHostRole) {
      throw new BadRequestException('User already has HOST role');
    }

    const hostRole = await this.prisma.role.findUnique({
      where: { name: 'HOST' },
    });

    if (!hostRole) {
      throw new BadRequestException('HOST role not found in system');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.create({
        data: {
          userId,
          roleId: hostRole.id,
          status: 'VERIFIED',
        },
      });

      const existingHost = await tx.host.findUnique({ where: { userId } });
      if (!existingHost) {
        await tx.host.create({ data: { userId } });
      }
    });

    return { message: 'Successfully registered as host' };
  }

  // Create host profile if not exists
  async createHostProfile(userId: string) {
    const existingHost = await this.prisma.host.findUnique({
      where: { userId },
    });

    if (existingHost) {
      return existingHost;
    }

    return this.prisma.host.create({
      data: {
        userId,
      },
    });
  }

  // Get host profile with locations
  async getHostProfile(userId: string) {
    const host = await this.prisma.host.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            profilePicture: true,
            createdAt: true,
          },
        },
        parkingLocations: {
          include: {
            images: true,
            parkingSpaces: true,
            _count: {
              select: {
                parkingSpaces: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!host) {
      throw new NotFoundException('Host profile not found');
    }

    const hostRating = await this.prisma.review.aggregate({
      where: {
        reviewType: ReviewType.DRIVER_TO_LOCATION,
        reservation: {
          parkingSpace: {
            parkingLocation: {
              hostId: host.id,
            },
          },
        },
      },
      _avg: { rating: true },
      _count: true,
    });

    const averageRating = hostRating._avg.rating
      ? Math.round(hostRating._avg.rating * 10) / 10
      : null;
    const totalReviews = hostRating._count;

    return {
      ...host,
      averageRating,
      totalReviews,
      totalLocations: host.parkingLocations.length,
      approvedLocations: host.parkingLocations.filter(
        (loc) => loc.status === 'APPROVED',
      ).length,
      pendingLocations: host.parkingLocations.filter(
        (loc) => loc.status === 'PENDING',
      ).length,
    };
  }

  // Create parking location
  async createParkingLocation(
    userId: string,
    createLocationDto: CreateParkingLocationDto,
  ) {
    await this.assertHostNotSuspended(userId);

    // Ensure host profile exists
    const host = await this.prisma.host.findUnique({
      where: { userId },
    });

    if (!host) {
      throw new NotFoundException(
        'Host profile not found. Please contact support.',
      );
    }

    const {
      imageUrls,
      levelSlots,
      spaceNames,
      proofOfResidenceUrl,
      acceptedVehicles,
      ...locationData
    } = createLocationDto;

    // Compute total slots
    const isMulti =
      !!createLocationDto.isMultiLevel && !!levelSlots && levelSlots.length > 0;
    const computedTotalSlots = isMulti
      ? levelSlots.reduce((sum, n) => sum + n, 0)
      : createLocationDto.totalSlots;

    const createdLocation = await this.prisma.$transaction(async (tx) => {
      // Create parking location
      const location = await tx.parkingLocation.create({
        data: {
          ...locationData,
          totalSlots: computedTotalSlots,
          numberOfLevels: isMulti ? levelSlots.length : undefined,
          hostId: host.id,
          availableSlots: computedTotalSlots || 1,
          status: 'PENDING',
          proofOfResidenceUrl,
          ...(acceptedVehicles &&
            acceptedVehicles.length > 0 && {
              acceptedVehicles: acceptedVehicles as VehicleType[],
            }),
        },
      });

      // Add images if provided
      if (imageUrls && imageUrls.length > 0) {
        await tx.parkingLocationImage.createMany({
          data: imageUrls.map((url, index) => ({
            parkingLocationId: location.id,
            imageUrl: url,
            isPrimary: index === 0,
          })),
        });
      }

      // Create parking spaces with names and level numbers
      if (isMulti) {
        const spaces: {
          parkingLocationId: string;
          slotNumber: number;
          name: string;
          levelNumber: number;
        }[] = [];
        let slotCounter = 0;

        for (let level = 1; level <= levelSlots.length; level++) {
          const slotsForLevel = levelSlots[level - 1];
          const prefix = levelToPrefix(level);
          for (let slot = 1; slot <= slotsForLevel; slot++) {
            const name =
              spaceNames && spaceNames[slotCounter]
                ? spaceNames[slotCounter]
                : `${prefix}${slot}`;
            spaces.push({
              parkingLocationId: location.id,
              slotNumber: slotCounter + 1,
              name,
              levelNumber: level,
            });
            slotCounter++;
          }
        }

        await tx.parkingSpace.createMany({ data: spaces });
      } else if (computedTotalSlots && computedTotalSlots > 0) {
        // Single-level: auto-name A1, A2... or use custom names
        const spaces = Array.from({ length: computedTotalSlots }, (_, i) => ({
          parkingLocationId: location.id,
          slotNumber: i + 1,
          name: spaceNames && spaceNames[i] ? spaceNames[i] : `A${i + 1}`,
          levelNumber: null as number | null,
        }));

        await tx.parkingSpace.createMany({ data: spaces });
      }

      return tx.parkingLocation.findUnique({
        where: { id: location.id },
        include: {
          images: true,
          parkingSpaces: true,
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
      });
    });

    if (createdLocation?.id && createdLocation.title) {
      try {
        const admins = await this.prisma.user.findMany({
          where: {
            userRoles: {
              some: {
                role: { name: 'ADMIN' },
                status: 'VERIFIED',
              },
            },
          },
          select: { id: true },
        });

        await Promise.all(
          admins.map((admin) =>
            this.notificationsService.send({
              userId: admin.id,
              title: 'New Listing For Approval',
              message: `A new listing "${createdLocation.title}" is waiting for approval.`,
              type: 'GENERAL',
              data: {
                kind: 'PENDING_LISTING',
                locationId: createdLocation.id,
              },
            }),
          ),
        );
      } catch {
        // Do not block location creation when notification dispatch fails.
      }
    }

    return createdLocation;
  }

  // Get host's parking locations
  async getHostParkingLocations(
    userId: string,
    queryDto: QueryParkingLocationsDto,
  ) {
    const host = await this.prisma.host.findUnique({
      where: { userId },
    });

    if (!host) {
      throw new NotFoundException('Host profile not found');
    }

    const { page = 1, limit = 10, search, status } = queryDto;
    const skip = (page - 1) * limit;

    const where: Prisma.ParkingLocationWhereInput = {
      hostId: host.id,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [locations, total] = await Promise.all([
      this.prisma.parkingLocation.findMany({
        where,
        skip,
        take: limit,
        include: {
          images: true,
          parkingSpaces: true,
          _count: {
            select: {
              parkingSpaces: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.parkingLocation.count({ where }),
    ]);

    return {
      data: locations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get single parking location
  async getParkingLocation(userId: string, locationId: string) {
    const host = await this.prisma.host.findUnique({
      where: { userId },
    });

    if (!host) {
      throw new NotFoundException('Host profile not found');
    }

    const location = await this.prisma.parkingLocation.findFirst({
      where: {
        id: locationId,
        hostId: host.id,
      },
      include: {
        images: true,
        parkingSpaces: {
          include: {
            reservations: {
              where: {
                status: 'ACTIVE',
              },
            },
          },
          orderBy: [{ levelNumber: 'asc' }, { slotNumber: 'asc' }],
        },
        _count: {
          select: {
            parkingSpaces: true,
          },
        },
      },
    });

    if (!location) {
      throw new NotFoundException('Parking location not found');
    }

    return location;
  }

  // Update parking location
  async updateParkingLocation(
    userId: string,
    locationId: string,
    updateLocationDto: UpdateParkingLocationDto,
  ) {
    await this.assertHostNotSuspended(userId);

    const host = await this.prisma.host.findUnique({
      where: { userId },
    });

    if (!host) {
      throw new NotFoundException('Host profile not found');
    }

    const location = await this.prisma.parkingLocation.findFirst({
      where: {
        id: locationId,
        hostId: host.id,
      },
      include: { images: true },
    });

    if (!location) {
      throw new NotFoundException('Parking location not found');
    }

    // If location is approved, changes require re-approval
    const newStatus =
      location.status === 'APPROVED' ? 'PENDING' : location.status;

    const {
      imageUrls,
      proofOfResidenceUrl,
      acceptedVehicles,
      ...locationData
    } = updateLocationDto;

    // Delete old images from S3 if new ones are provided
    if (imageUrls && imageUrls.length > 0) {
      const oldUrls = location.images.map((img) => img.imageUrl);
      await this.s3
        .deleteByUrls(oldUrls)
        .catch((err) => console.warn('Failed to delete old S3 images:', err));
    }

    // Delete old proof of residence from S3 if new one is provided
    if (proofOfResidenceUrl && location.proofOfResidenceUrl) {
      await this.s3
        .deleteByUrl(location.proofOfResidenceUrl)
        .catch((err) =>
          console.warn('Failed to delete old proof of residence:', err),
        );
    }

    return this.prisma.$transaction(async (tx) => {
      // Update location
      const updatedLocation = await tx.parkingLocation.update({
        where: { id: locationId },
        data: {
          ...locationData,
          ...(proofOfResidenceUrl && { proofOfResidenceUrl }),
          ...(acceptedVehicles && {
            acceptedVehicles: acceptedVehicles as VehicleType[],
          }),
          status: newStatus, // Reset to pending if was approved
          availableSlots:
            updateLocationDto.totalSlots || location.availableSlots,
        },
      });

      // Update images if provided
      if (imageUrls && imageUrls.length > 0) {
        // Delete existing image records
        await tx.parkingLocationImage.deleteMany({
          where: { parkingLocationId: locationId },
        });

        // Add new images
        await tx.parkingLocationImage.createMany({
          data: imageUrls.map((url, index) => ({
            parkingLocationId: locationId,
            imageUrl: url,
            isPrimary: index === 0,
          })),
        });
      }

      return updatedLocation;
    });
  }

  // Delete parking location
  async deleteParkingLocation(userId: string, locationId: string) {
    await this.assertHostNotSuspended(userId);

    const host = await this.prisma.host.findUnique({
      where: { userId },
    });

    if (!host) {
      throw new NotFoundException('Host profile not found');
    }

    const location = await this.prisma.parkingLocation.findFirst({
      where: {
        id: locationId,
        hostId: host.id,
      },
      include: { images: true },
    });

    if (!location) {
      throw new NotFoundException('Parking location not found');
    }

    // Check for active reservations
    const activeReservations = await this.prisma.reservation.count({
      where: {
        parkingSpace: {
          parkingLocationId: locationId,
        },
        status: {
          in: ['PENDING', 'CONFIRMED', 'ACTIVE'],
        },
      },
    });

    if (activeReservations > 0) {
      throw new BadRequestException(
        'Cannot delete location with active reservations',
      );
    }

    // Soft delete — mark as deleted, keep in DB
    await this.prisma.parkingLocation.update({
      where: { id: locationId },
      data: { deletedAt: new Date() },
    });

    return { message: 'Parking location deleted successfully' };
  }

  // Toggle parking location (APPROVED <-> DISABLED)
  async toggleParkingLocation(userId: string, locationId: string) {
    await this.assertHostNotSuspended(userId);

    const host = await this.prisma.host.findUnique({
      where: { userId },
    });

    if (!host) {
      throw new NotFoundException('Host profile not found');
    }

    const location = await this.prisma.parkingLocation.findFirst({
      where: {
        id: locationId,
        hostId: host.id,
      },
    });

    if (!location) {
      throw new NotFoundException('Parking location not found');
    }

    if (location.status === 'PENDING' || location.status === 'REJECTED') {
      throw new BadRequestException(
        'Only approved or disabled locations can be toggled.',
      );
    }

    // Check for active reservations before disabling
    if (location.status === 'APPROVED') {
      const activeReservations = await this.prisma.reservation.count({
        where: {
          parkingSpace: { parkingLocationId: locationId },
          status: { in: ['PENDING', 'CONFIRMED', 'ACTIVE'] },
        },
      });

      if (activeReservations > 0) {
        throw new BadRequestException(
          `Cannot disable location with ${activeReservations} active reservation(s). Wait for them to complete or cancel them first.`,
        );
      }
    }

    const newStatus = location.status === 'DISABLED' ? 'APPROVED' : 'DISABLED';

    const updated = await this.prisma.parkingLocation.update({
      where: { id: locationId },
      data: { status: newStatus },
    });

    return updated;
  }

  // Toggle parking space status (AVAILABLE <-> DISABLED)
  async toggleParkingSpace(userId: string, spaceId: string) {
    await this.assertHostNotSuspended(userId);

    const host = await this.prisma.host.findUnique({
      where: { userId },
    });

    if (!host) {
      throw new NotFoundException('Host profile not found');
    }

    const space = await this.prisma.parkingSpace.findFirst({
      where: {
        id: spaceId,
        parkingLocation: { hostId: host.id },
      },
      include: {
        reservations: {
          where: { status: { in: ['PENDING', 'CONFIRMED', 'ACTIVE'] } },
        },
      },
    });

    if (!space) {
      throw new NotFoundException('Parking space not found');
    }

    if (space.status === 'OCCUPIED') {
      throw new BadRequestException(
        'Cannot disable an occupied space. Wait for the current session to end.',
      );
    }

    if (space.reservations.length > 0 && space.status === 'AVAILABLE') {
      throw new BadRequestException(
        'Cannot disable a space with active or upcoming reservations.',
      );
    }

    const newStatus = space.status === 'DISABLED' ? 'AVAILABLE' : 'DISABLED';

    const updated = await this.prisma.parkingSpace.update({
      where: { id: spaceId },
      data: {
        status: newStatus,
        isActive: newStatus === 'AVAILABLE',
      },
    });

    // Update available slots count on location
    const availableCount = await this.prisma.parkingSpace.count({
      where: {
        parkingLocationId: space.parkingLocationId,
        status: 'AVAILABLE',
      },
    });

    await this.prisma.parkingLocation.update({
      where: { id: space.parkingLocationId },
      data: { availableSlots: availableCount },
    });

    return updated;
  }

  // Delete a parking space
  async deleteParkingSpace(userId: string, spaceId: string) {
    await this.assertHostNotSuspended(userId);

    const host = await this.prisma.host.findUnique({
      where: { userId },
    });

    if (!host) {
      throw new NotFoundException('Host profile not found');
    }

    const space = await this.prisma.parkingSpace.findFirst({
      where: {
        id: spaceId,
        parkingLocation: { hostId: host.id },
      },
      include: {
        reservations: {
          where: { status: { in: ['PENDING', 'CONFIRMED', 'ACTIVE'] } },
        },
      },
    });

    if (!space) {
      throw new NotFoundException('Parking space not found');
    }

    if (space.reservations.length > 0) {
      throw new BadRequestException(
        'Cannot delete a space with active or upcoming reservations. Disable it instead.',
      );
    }

    await this.prisma.parkingSpace.delete({
      where: { id: spaceId },
    });

    // Update slot counts on location
    const [totalCount, availableCount] = await Promise.all([
      this.prisma.parkingSpace.count({
        where: { parkingLocationId: space.parkingLocationId },
      }),
      this.prisma.parkingSpace.count({
        where: {
          parkingLocationId: space.parkingLocationId,
          status: 'AVAILABLE',
        },
      }),
    ]);

    await this.prisma.parkingLocation.update({
      where: { id: space.parkingLocationId },
      data: {
        totalSlots: totalCount,
        availableSlots: availableCount,
      },
    });

    return { message: 'Parking space deleted successfully' };
  }

  // Admin: Get all parking locations
  async getAllParkingLocations(queryDto: QueryParkingLocationsDto) {
    const { page = 1, limit = 10, search, status } = queryDto;
    const skip = (page - 1) * limit;
    const isUuidSearch =
      !!search &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        search,
      );

    const where: Prisma.ParkingLocationWhereInput = {};

    if (search) {
      where.OR = [
        ...(isUuidSearch ? [{ id: search }] : []),
        { title: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        {
          host: { user: { email: { contains: search, mode: 'insensitive' } } },
        },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [locations, total] = await Promise.all([
      this.prisma.parkingLocation.findMany({
        where,
        skip,
        take: limit,
        include: {
          host: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  phoneNumber: true,
                  profilePicture: true,
                  userRoles: {
                    where: {
                      role: {
                        name: 'HOST',
                      },
                    },
                    select: {
                      status: true,
                      role: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          images: true,
          parkingSpaces: {
            select: {
              id: true,
              slotNumber: true,
              name: true,
              levelNumber: true,
              status: true,
              isActive: true,
              reservations: {
                where: {
                  status: {
                    in: ['CONFIRMED', 'ACTIVE'],
                  },
                },
                select: {
                  id: true,
                  status: true,
                },
              },
            },
            orderBy: [{ levelNumber: 'asc' }, { slotNumber: 'asc' }],
          },
          _count: {
            select: {
              parkingSpaces: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.parkingLocation.count({ where }),
    ]);

    return {
      data: locations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Admin: Update parking location status
  async updateLocationStatus(
    locationId: string,
    updateStatusDto: UpdateLocationStatusDto,
  ) {
    const location = await this.prisma.parkingLocation.findUnique({
      where: { id: locationId },
      include: {
        host: {
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!location) {
      throw new NotFoundException('Parking location not found');
    }

    const updatedLocation = await this.prisma.parkingLocation.update({
      where: { id: locationId },
      data: {
        status: updateStatusDto.status,
      },
    });

    // Notify host about location status change
    if (updateStatusDto.status === 'APPROVED') {
      this.notificationsService
        .notifyLocationApproved(
          location.host.userId,
          location.title,
          locationId,
        )
        .catch(() => {});
    } else if (updateStatusDto.status === 'REJECTED') {
      this.notificationsService
        .notifyLocationRejected(
          location.host.userId,
          location.title,
          locationId,
        )
        .catch(() => {});
    }

    return {
      message: `Parking location ${updateStatusDto.status.toLowerCase()}`,
      location: updatedLocation,
      host: location.host.user,
    };
  }

  // Public: Get approved parking locations for drivers/browsing
  async getApprovedLocations(params?: {
    latitude?: number;
    longitude?: number;
    radius?: number;
    search?: string;
    limit?: number;
  }) {
    const { latitude, longitude, radius, search, limit } = params || {};
    const requestedLimit = Number.isFinite(limit) ? Number(limit) : 50;
    const boundedLimit = Math.min(Math.max(requestedLimit, 1), 100);
    const requestedRadius = Number.isFinite(radius) ? Number(radius) : 20;
    const radiusKm = requestedRadius > 0 ? requestedRadius : 20;
    const hasCoordinates =
      Number.isFinite(latitude) && Number.isFinite(longitude);

    const where: Prisma.ParkingLocationWhereInput = {
      status: 'APPROVED',
      host: {
        user: {
          userRoles: {
            none: {
              role: { name: 'HOST' },
              status: 'SUSPENDED',
            },
          },
        },
      },
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (hasCoordinates) {
      const centerLatitude = Number(latitude);
      const centerLongitude = Number(longitude);
      const latitudeDelta = radiusKm / 111;
      const latitudeRadians = (centerLatitude * Math.PI) / 180;
      const longitudeDelta =
        radiusKm / (111 * Math.max(Math.abs(Math.cos(latitudeRadians)), 0.01));

      where.latitude = {
        gte: centerLatitude - latitudeDelta,
        lte: centerLatitude + latitudeDelta,
      };
      where.longitude = {
        gte: centerLongitude - longitudeDelta,
        lte: centerLongitude + longitudeDelta,
      };
    }

    const locations = (await this.prisma.parkingLocation.findMany({
      where,
      take: hasCoordinates ? Math.min(boundedLimit * 2, 200) : boundedLimit,
      select: {
        id: true,
        title: true,
        address: true,
        latitude: true,
        longitude: true,
        basePricePerHour: true,
        totalSlots: true,
        availableSlots: true,
        allowParkAnywhere: true,
        acceptedVehicles: true,
        openTime: true,
        closeTime: true,
        is24Hours: true,
        images: {
          where: { isPrimary: true },
          take: 1,
          select: { imageUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })) as BrowseLocationRow[];

    const openLocations = locations.filter((location) =>
      this.isLocationCurrentlyOpen(location),
    );

    const toPublicBrowseLocation = (
      location: BrowseLocationRow,
    ): PublicBrowseLocation => {
      const { openTime, closeTime, is24Hours, ...publicLocation } = location;
      return publicLocation;
    };

    if (!hasCoordinates) {
      return openLocations.map(toPublicBrowseLocation);
    }

    const centerLatitude = Number(latitude);
    const centerLongitude = Number(longitude);

    return openLocations
      .map((location) => ({
        location: toPublicBrowseLocation(location),
        distanceKm: getDistanceKm(
          centerLatitude,
          centerLongitude,
          Number(location.latitude),
          Number(location.longitude),
        ),
      }))
      .filter((item) => item.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, boundedLimit)
      .map((item) => item.location);
  }

  private isLocationCurrentlyOpen(location: {
    openTime?: string | null;
    closeTime?: string | null;
    is24Hours?: boolean;
  }): boolean {
    if (location.is24Hours) {
      return true;
    }

    if (!location.openTime || !location.closeTime) {
      return true;
    }

    const openMinutes = this.parseTimeToMinutes(location.openTime);
    const closeMinutes = this.parseTimeToMinutes(location.closeTime);

    if (openMinutes === null || closeMinutes === null) {
      return true;
    }

    if (openMinutes === closeMinutes) {
      return true;
    }

    const currentMinutes = this.getCurrentMinutesInTimezone('Asia/Manila');

    if (closeMinutes > openMinutes) {
      return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    }

    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }

  private parseTimeToMinutes(value: string): number | null {
    const [hourRaw, minuteRaw] = value.split(':');
    const hour = Number(hourRaw);
    const minute = Number(minuteRaw);

    if (
      !Number.isInteger(hour) ||
      !Number.isInteger(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      return null;
    }

    return hour * 60 + minute;
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

  // Public: Get single approved parking location details
  async getApprovedLocationById(locationId: string) {
    const location = await this.prisma.parkingLocation.findFirst({
      where: {
        id: locationId,
        status: 'APPROVED',
        host: {
          user: {
            userRoles: {
              none: {
                role: { name: 'HOST' },
                status: 'SUSPENDED',
              },
            },
          },
        },
      },
      include: {
        images: {
          orderBy: { isPrimary: 'desc' },
        },
        host: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                profilePicture: true,
              },
            },
          },
        },
        parkingSpaces: {
          select: {
            id: true,
            slotNumber: true,
            name: true,
            levelNumber: true,
            status: true,
          },
          orderBy: [{ levelNumber: 'asc' }, { slotNumber: 'asc' }],
        },
      },
    });

    if (!location) {
      throw new NotFoundException('Parking location not found');
    }

    return location;
  }

  // Get host statistics
  async getHostStatistics(userId: string) {
    const host = await this.prisma.host.findUnique({
      where: { userId },
    });

    if (!host) {
      throw new NotFoundException('Host profile not found');
    }

    const [
      totalLocations,
      approvedLocations,
      pendingLocations,
      rejectedLocations,
      totalReservations,
      activeReservations,
    ] = await Promise.all([
      this.prisma.parkingLocation.count({
        where: { hostId: host.id },
      }),
      this.prisma.parkingLocation.count({
        where: { hostId: host.id, status: 'APPROVED' },
      }),
      this.prisma.parkingLocation.count({
        where: { hostId: host.id, status: 'PENDING' },
      }),
      this.prisma.parkingLocation.count({
        where: { hostId: host.id, status: 'REJECTED' },
      }),
      this.prisma.reservation.count({
        where: {
          parkingSpace: {
            parkingLocation: {
              hostId: host.id,
            },
          },
        },
      }),
      this.prisma.reservation.count({
        where: {
          parkingSpace: {
            parkingLocation: {
              hostId: host.id,
            },
          },
          status: 'ACTIVE',
        },
      }),
    ]);

    return {
      locations: {
        total: totalLocations,
        approved: approvedLocations,
        pending: pendingLocations,
        rejected: rejectedLocations,
      },
      reservations: {
        total: totalReservations,
        active: activeReservations,
      },
    };
  }
}
