import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDriverProfileDto } from './dto/create-driver-profile.dto';
import { UpdateDriverProfileDto } from './dto/update-driver-profile.dto';
import { QueryDriversDto } from './dto/query-drivers.dto';
import { UpdateDriverStatusDto } from './dto/update-driver-status.dto';
import { CreateDriverVehicleDto } from './dto/create-driver-vehicle.dto';
import { UpdateDriverVehicleDto } from './dto/update-driver-vehicle.dto';
import { QueryDriverVehiclesDto } from './dto/query-driver-vehicles.dto';
import { Prisma, VerificationStatus, RoleName } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DriversService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  // ========== DRIVER PROFILE MANAGEMENT ==========

  // Apply as driver (create/update driver profile)
  async applyAsDriver(userId: string, createDriverDto: CreateDriverProfileDto) {
    // Check if user has DRIVER role, if not create it (e.g. HOST applying as driver)
    let userRole = await this.prisma.userRole.findFirst({
      where: {
        userId,
        role: {
          name: RoleName.DRIVER,
        },
      },
      include: {
        role: true,
      },
    });

    let shouldNotifyAdmin = false;

    if (!userRole) {
      const driverRole = await this.prisma.role.findUnique({
        where: { name: RoleName.DRIVER },
      });
      if (!driverRole) {
        throw new BadRequestException('DRIVER role not found in system');
      }
      userRole = await this.prisma.userRole.create({
        data: {
          userId,
          roleId: driverRole.id,
          status: 'PENDING',
        },
        include: {
          role: true,
        },
      });

      shouldNotifyAdmin = true;
    } else if (userRole.status !== VerificationStatus.VERIFIED) {
      await this.prisma.userRole.update({
        where: {
          userId_roleId: {
            userId,
            roleId: userRole.roleId,
          },
        },
        data: { status: VerificationStatus.PENDING },
      });

      shouldNotifyAdmin = userRole.status !== VerificationStatus.PENDING;
    }

    // Check if driver profile already exists
    const existingDriver = await this.prisma.driver.findUnique({
      where: { userId },
    });

    let driverProfile;

    if (existingDriver) {
      // Update existing driver profile
      driverProfile = await this.prisma.driver.update({
        where: { userId },
        data: {
          ...createDriverDto,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
            },
          },
          vehicles: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    } else {
      // Create new driver profile
      driverProfile = await this.prisma.driver.create({
        data: {
          userId,
          ...createDriverDto,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
            },
          },
          vehicles: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    }

    if (shouldNotifyAdmin && driverProfile?.id) {
      this.notificationsService
        .notifyAdminsPendingDriver(driverProfile.id)
        .catch(() => {});
    }

    return driverProfile;
  }

  // Get driver profile
  async getDriverProfile(userId: string) {
    const driver = await this.prisma.driver.findUnique({
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
            userRoles: {
              where: {
                role: {
                  name: RoleName.DRIVER,
                },
              },
              select: {
                status: true,
                assignedAt: true,
              },
            },
          },
        },
        vehicles: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    return {
      ...driver,
      verificationStatus: driver.user.userRoles[0]?.status || 'PENDING',
    };
  }

  /** Like getDriverProfile but returns null instead of throwing */
  async getDriverProfileSafe(userId: string) {
    return this.prisma.driver.findUnique({
      where: { userId },
      include: {
        user: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }

  // Update driver profile
  async updateDriverProfile(
    userId: string,
    updateDriverDto: UpdateDriverProfileDto,
  ) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
    });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    return this.prisma.driver.update({
      where: { userId },
      data: updateDriverDto,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        vehicles: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  // ========== VEHICLE MANAGEMENT ==========

  // Add vehicle
  async addVehicle(userId: string, createVehicleDto: CreateDriverVehicleDto) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
    });

    if (!driver) {
      throw new NotFoundException(
        'Driver profile not found. Please complete your driver application first.',
      );
    }

    // Check if plate number already exists
    const existingVehicle = await this.prisma.driverVehicle.findFirst({
      where: {
        plateNumber: createVehicleDto.plateNumber,
      },
    });

    if (existingVehicle) {
      throw new ConflictException(
        'Vehicle with this plate number already exists',
      );
    }

    return this.prisma.driverVehicle.create({
      data: {
        driverId: driver.id,
        ...createVehicleDto,
      },
    });
  }

  // Get driver vehicles
  async getDriverVehicles(userId: string, queryDto: QueryDriverVehiclesDto) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    const { search, vehicleType, isActive } = queryDto;

    const where: Prisma.DriverVehicleWhereInput = {
      driverId: driver.id,
      ...(vehicleType && { vehicleType }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { plateNumber: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
          { color: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const vehicles = await this.prisma.driverVehicle.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });

    return vehicles;
  }

  // Update vehicle
  async updateVehicle(
    userId: string,
    vehicleId: string,
    updateVehicleDto: UpdateDriverVehicleDto,
  ) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    const vehicle = await this.prisma.driverVehicle.findFirst({
      where: {
        id: vehicleId,
        driverId: driver.id,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    // Check plate number conflict if updating
    if (updateVehicleDto.plateNumber) {
      const existingVehicle = await this.prisma.driverVehicle.findFirst({
        where: {
          plateNumber: updateVehicleDto.plateNumber,
          id: { not: vehicleId },
        },
      });

      if (existingVehicle) {
        throw new ConflictException(
          'Vehicle with this plate number already exists',
        );
      }
    }

    return this.prisma.driverVehicle.update({
      where: { id: vehicleId },
      data: updateVehicleDto,
    });
  }

  // Delete vehicle (soft delete by setting isActive to false)
  async deleteVehicle(userId: string, vehicleId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    const vehicle = await this.prisma.driverVehicle.findFirst({
      where: {
        id: vehicleId,
        driverId: driver.id,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return this.prisma.driverVehicle.update({
      where: { id: vehicleId },
      data: { isActive: false },
    });
  }

  // ========== ADMIN FUNCTIONS ==========

  // Get all drivers for admin
  async getAllDrivers(queryDto: QueryDriversDto) {
    const { page = 1, limit = 10, search, status } = queryDto;
    const skip = (page - 1) * limit;
    const isUuidSearch =
      !!search &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        search,
      );

    const where: Prisma.DriverWhereInput = {
      ...(search && {
        OR: [
          ...(isUuidSearch ? [{ id: search }] : []),
          { licenseNumber: { contains: search, mode: 'insensitive' } },
          {
            vehicles: {
              some: {
                plateNumber: { contains: search, mode: 'insensitive' },
              },
            },
          },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { user: { firstName: { contains: search, mode: 'insensitive' } } },
          { user: { lastName: { contains: search, mode: 'insensitive' } } },
        ],
      }),
      ...(status && {
        user: {
          userRoles: {
            some: {
              role: { name: RoleName.DRIVER },
              status,
            },
          },
        },
      }),
    };

    const [drivers, total] = await Promise.all([
      this.prisma.driver.findMany({
        where,
        skip,
        take: limit,
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
                  role: { name: RoleName.DRIVER },
                },
                select: {
                  status: true,
                  assignedAt: true,
                },
              },
            },
          },
          vehicles: {
            select: {
              id: true,
              plateNumber: true,
              vehicleType: true,
              isActive: true,
            },
          },
          _count: {
            select: {
              vehicles: true,
              reservations: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.driver.count({ where }),
    ]);

    return {
      drivers: drivers.map((driver) => ({
        ...driver,
        verificationStatus: driver.user.userRoles[0]?.status || 'PENDING',
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Update driver status (admin)
  async updateDriverStatus(
    driverId: string,
    updateStatusDto: UpdateDriverStatusDto,
  ) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { userId: true },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    // Update user role status
    const updatedUserRole = await this.prisma.userRole.updateMany({
      where: {
        userId: driver.userId,
        role: {
          name: RoleName.DRIVER,
        },
      },
      data: {
        status: updateStatusDto.status,
      },
    });

    if (updatedUserRole.count === 0) {
      throw new NotFoundException('Driver role not found for user');
    }

    // Log admin action if needed
    // TODO: Add admin logging

    return {
      message: 'Driver status updated successfully',
      status: updateStatusDto.status,
    };
  }

  // Get driver statistics
  async getDriverStatistics() {
    const [total, pending, verified, rejected, suspended, totalVehicles] =
      await Promise.all([
        this.prisma.driver.count(),
        this.prisma.userRole.count({
          where: {
            role: { name: RoleName.DRIVER },
            status: VerificationStatus.PENDING,
          },
        }),
        this.prisma.userRole.count({
          where: {
            role: { name: RoleName.DRIVER },
            status: VerificationStatus.VERIFIED,
          },
        }),
        this.prisma.userRole.count({
          where: {
            role: { name: RoleName.DRIVER },
            status: VerificationStatus.REJECTED,
          },
        }),
        this.prisma.userRole.count({
          where: {
            role: { name: RoleName.DRIVER },
            status: VerificationStatus.SUSPENDED,
          },
        }),
        this.prisma.driverVehicle.count({
          where: { isActive: true },
        }),
      ]);

    return {
      total,
      pending,
      verified,
      rejected,
      suspended,
      totalVehicles,
      approvalRate: total > 0 ? Math.round((verified / total) * 100) : 0,
    };
  }
}
