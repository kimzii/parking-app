import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { EmailService } from '../common/email.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
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

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
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
        driver: {
          select: {
            id: true,
            licenseNumber: true,
            licenseImageUrl: true,
            vehicles: {
              select: {
                id: true,
                plateNumber: true,
                vehicleType: true,
                brand: true,
                model: true,
                color: true,
                isActive: true,
                createdAt: true,
              },
            },
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
      status: string;
      totalAmount: number;
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
        status: r.status,
        totalAmount: r.totalAmount ? r.totalAmount.toNumber() : 0,
        parkingLocation: r.parkingSpace?.parkingLocation || null,
      }));
    }

    return {
      ...user,
      roles: user.userRoles.map((ur) => ur.role.name),
      roleStatuses: user.userRoles.map((ur) => ({
        role: ur.role.name,
        status: ur.status,
      })),
      driver: user.driver
        ? {
            ...user.driver,
            reservations,
          }
        : undefined,
    };
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
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete the user and all related data (cascading deletes handled by Prisma)
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return {
      message: 'User deleted successfully',
      deletedUserId: userId,
    };
  }
}
