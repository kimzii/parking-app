import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, ReviewType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { EmailService } from '../common/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
  ) {}

  // Get current user profile
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        profilePicture: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        userRoles: {
          select: {
            status: true,
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        wallet: {
          select: {
            id: true,
            balance: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      walletBalance: user.wallet?.balance ?? 0,
      roles: user.userRoles.map((ur) => ur.role.name),
      roleStatuses: user.userRoles.map((ur) => ({
        roleId: ur.role.id,
        role: ur.role.name,
        status: ur.status,
      })),
    };
  }

  // Update user profile
  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateProfileDto,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        profilePicture: true,
        updatedAt: true,
      },
    });

    return {
      message: 'Profile updated successfully',
      user,
    };
  }

  // Change password
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    return {
      message: 'Password changed successfully',
    };
  }

  // Admin: Get all users with filters
  async getAllUsers(queryDto: QueryUsersDto) {
    const { role, status, search, page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;
    const isUuidSearch =
      !!search &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        search,
      );

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        ...(isUuidSearch ? [{ id: search }] : []),
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role || status) {
      where.userRoles = {
        some: {
          ...(role
            ? {
                role: {
                  name: role,
                },
              }
            : {}),
          ...(status ? { status } : {}),
        },
      };
    }

    // Get users and total count
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          profilePicture: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          userRoles: {
            select: {
              status: true,
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Format response
    const formattedUsers = users.map((user) => ({
      ...user,
      roles: user.userRoles.map((ur) => ur.role.name),
      roleStatuses: user.userRoles.map((ur) => ({
        roleId: ur.role.id,
        role: ur.role.name,
        status: ur.status,
      })),
    }));

    return {
      data: formattedUsers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Admin: Update user role status
  async updateUserRoleStatus(
    userId: string,
    roleId: string,
    updateStatusDto: UpdateUserStatusDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userRole = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
      include: {
        role: true,
      },
    });

    if (!userRole) {
      throw new NotFoundException('User role not found');
    }

    const updatedUserRole = await this.prisma.userRole.update({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
      data: {
        status: updateStatusDto.status,
      },
      include: {
        role: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Send notification when driver or host is verified
    if (
      userRole.role.name === 'DRIVER' &&
      updateStatusDto.status === 'VERIFIED'
    ) {
      this.notificationsService.notifyDriverVerified(userId).catch(() => {});
    } else if (
      userRole.role.name === 'HOST' &&
      updateStatusDto.status === 'VERIFIED'
    ) {
      this.notificationsService.notifyHostVerified(userId).catch(() => {});
    }

    return {
      message: `User ${userRole.role.name} role status updated to ${updateStatusDto.status}`,
      userRole: updatedUserRole,
    };
  }

  // Admin: Get user statistics
  async getUserStatistics() {
    const [
      total,
      pendingRoles,
      verifiedRoles,
      rejectedRoles,
      drivers,
      hosts,
      admins,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.userRole.count({ where: { status: 'PENDING' } }),
      this.prisma.userRole.count({ where: { status: 'VERIFIED' } }),
      this.prisma.userRole.count({ where: { status: 'REJECTED' } }),
      this.prisma.user.count({
        where: {
          userRoles: {
            some: {
              role: {
                name: 'DRIVER',
              },
            },
          },
        },
      }),
      this.prisma.user.count({
        where: {
          userRoles: {
            some: {
              role: {
                name: 'HOST',
              },
            },
          },
        },
      }),
      this.prisma.user.count({
        where: {
          userRoles: {
            some: {
              role: {
                name: 'ADMIN',
              },
            },
          },
        },
      }),
    ]);

    return {
      total,
      byRoleStatus: {
        pending: pendingRoles,
        verified: verifiedRoles,
        rejected: rejectedRoles,
      },
      byRole: {
        drivers,
        hosts,
        admins,
      },
    };
  }

  // Admin: Get user by ID with full profile details
  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        profilePicture: true,
        sex: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        termsAcceptedAt: true,
        privacyAcceptedAt: true,
        userRoles: {
          select: {
            status: true,
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        driver: {
          select: {
            id: true,
            licenseNumber: true,
            licenseImageUrl: true,
            vehicles: {
              where: { deletedAt: null },
              select: {
                id: true,
                plateNumber: true,
                vehicleType: true,
                brand: true,
                model: true,
                color: true,
                isActive: true,
                registrationImageUrl: true,
                verificationStatus: true,
                rejectionReason: true,
                createdAt: true,
              },
            } as any,
          },
        },
        host: {
          select: {
            id: true,
            parkingLocations: {
              select: {
                id: true,
                title: true,
                address: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Fetch reservations separately if user is a driver
    let reservations: {
      id: string;
      arrivalDeadline: Date;
      sessionStartedAt: Date | null;
      sessionEndedAt: Date | null;
      startTime: Date;
      endTime: Date | null;
      status: string;
      totalAmount: number;
      hostName: string;
      propertyTitle: string;
      parkingLocation: { title: string; address: string } | null;
    }[] = [];

    if (user.driver) {
      const driverReservations = await this.prisma.reservation.findMany({
        where: { driverId: user.driver.id },
        take: 15,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          arrivalDeadline: true,
          sessionStartedAt: true,
          sessionEndedAt: true,
          status: true,
          totalAmount: true,
          parkingSpace: {
            select: {
              parkingLocation: {
                select: {
                  title: true,
                  address: true,
                  host: {
                    select: {
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
      });

      reservations = driverReservations.map((r) => ({
        id: r.id,
        arrivalDeadline: r.arrivalDeadline,
        sessionStartedAt: r.sessionStartedAt,
        sessionEndedAt: r.sessionEndedAt,
        startTime: r.sessionStartedAt ?? r.arrivalDeadline,
        endTime: r.sessionEndedAt,
        status: r.status,
        totalAmount: r.totalAmount ? r.totalAmount.toNumber() : 0,
        hostName:
          r.parkingSpace.parkingLocation.host.user.firstName &&
          r.parkingSpace.parkingLocation.host.user.lastName
            ? `${r.parkingSpace.parkingLocation.host.user.firstName} ${r.parkingSpace.parkingLocation.host.user.lastName}`
            : r.parkingSpace.parkingLocation.host.user.email,
        propertyTitle: r.parkingSpace.parkingLocation.title,
        parkingLocation: r.parkingSpace?.parkingLocation || null,
      }));
    }

    // Fetch host parking location revenue separately if user is a host
    let hostParkingLocations: {
      id: string;
      title: string;
      address: string;
      status: string;
      createdAt: Date;
      revenueTotal: number;
    }[] = [];
    let hostAverageRating: number | null = null;
    let hostTotalReviews = 0;

    if (user.host) {
      const hostLocations = await this.prisma.parkingLocation.findMany({
        where: { hostId: user.host.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          address: true,
          status: true,
          createdAt: true,
          parkingSpaces: {
            select: {
              reservations: {
                where: { status: 'COMPLETED' },
                select: { totalAmount: true },
              },
            },
          },
        },
      });

      hostParkingLocations = hostLocations.map((location) => ({
        id: location.id,
        title: location.title,
        address: location.address,
        status: location.status,
        createdAt: location.createdAt,
        revenueTotal: location.parkingSpaces.reduce((locationTotal, space) => {
          const spaceTotal = space.reservations.reduce(
            (reservationTotal, reservation) =>
              reservationTotal + reservation.totalAmount.toNumber(),
            0,
          );
          return locationTotal + spaceTotal;
        }, 0),
      }));

      const hostRating = await this.prisma.review.aggregate({
        where: {
          reviewType: ReviewType.DRIVER_TO_LOCATION,
          reservation: {
            parkingSpace: {
              parkingLocation: {
                hostId: user.host.id,
              },
            },
          },
        },
        _avg: { rating: true },
        _count: true,
      });

      hostAverageRating = hostRating._avg.rating
        ? Math.round(hostRating._avg.rating * 10) / 10
        : null;
      hostTotalReviews = hostRating._count;
    }

    return {
      ...user,
      roles: user.userRoles.map((ur) => ur.role.name),
      roleStatuses: user.userRoles.map((ur) => ({
        roleId: ur.role.id,
        role: ur.role.name,
        status: ur.status,
      })),
      driver: user.driver
        ? {
            ...user.driver,
            reservations,
          }
        : undefined,
      host: user.host
        ? {
            ...user.host,
            parkingLocations: hostParkingLocations,
            averageRating: hostAverageRating,
            totalReviews: hostTotalReviews,
          }
        : undefined,
    };
  }

  // Admin: Update user profile fields by ID
  async updateUserByAdmin(userId: string, updateUserDto: AdminUpdateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: updateUserDto,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          profilePicture: true,
          updatedAt: true,
        },
      });

      return {
        message: 'User updated successfully',
        user: updatedUser,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A user with this email already exists');
      }

      throw error;
    }
  }

  // Admin: Create a new admin user
  async createAdmin(createAdminDto: CreateAdminDto) {
    const { email, firstName, lastName, phoneNumber } = createAdminDto;

    // Check if user with this email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    // Generate a random temporary password
    const temporaryPassword = this.generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    // Get the ADMIN role
    const adminRole = await this.prisma.role.findUnique({
      where: { name: 'ADMIN' },
    });

    if (!adminRole) {
      throw new NotFoundException('Admin role not found in the system');
    }

    // Create the user with admin role
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phoneNumber,
        emailVerified: true, // Admin accounts are pre-verified
        userRoles: {
          create: {
            roleId: adminRole.id,
            status: 'VERIFIED', // Admin roles are pre-verified
          },
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

    // Try to send credentials via email (don't fail if email service is unavailable)
    let emailSent = false;
    try {
      await this.emailService.sendAdminCredentialsEmail(
        email,
        firstName,
        temporaryPassword,
      );
      emailSent = true;
    } catch (error) {
      console.error('Failed to send admin credentials email:', error);
    }

    return {
      message: emailSent
        ? 'Admin account created successfully. Credentials have been sent via email.'
        : 'Admin account created successfully. Email could not be sent - please share credentials manually.',
      user,
      temporaryPassword: emailSent ? undefined : temporaryPassword, // Only include password if email failed
    };
  }

  // Helper: Generate a random temporary password
  private generateTemporaryPassword(): string {
    const length = 12;
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '@$!%*?&';
    const all = uppercase + lowercase + numbers + special;

    // Ensure at least one of each required character type
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle the password
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  // Admin: Delete user
  async deleteUser(userId: string, requestingUserId: string) {
    // Prevent admin from deleting themselves
    if (userId === requestingUserId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
        driver: { select: { id: true } },
        host: { select: { id: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has any reservations as a driver
    if (user.driver) {
      const driverReservations = await this.prisma.reservation.count({
        where: { driverId: user.driver.id },
      });
      if (driverReservations > 0) {
        throw new BadRequestException(
          `Cannot delete this user. They have ${driverReservations} reservation(s) as a driver. Suspend the account instead.`,
        );
      }
    }

    // Check if user has any reservations as a host (through their parking locations)
    if (user.host) {
      const hostReservations = await this.prisma.reservation.count({
        where: {
          parkingSpace: {
            parkingLocation: {
              hostId: user.host.id,
            },
          },
        },
      });
      if (hostReservations > 0) {
        throw new BadRequestException(
          `Cannot delete this user. They have ${hostReservations} reservation(s) on their parking spaces. Suspend the account instead.`,
        );
      }
    }

    // Check if user has any wallet transactions
    const walletTransactions = await this.prisma.walletTransaction.count({
      where: { wallet: { userId } },
    });
    if (walletTransactions > 0) {
      throw new BadRequestException(
        `Cannot delete this user. They have ${walletTransactions} wallet transaction(s). Suspend the account instead.`,
      );
    }

    // Safe to delete — user has no booking or transaction history
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return {
      message: 'User deleted successfully',
      deletedUserId: userId,
    };
  }
}
