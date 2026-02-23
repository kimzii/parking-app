import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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
          include: {
            role: true,
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
    const { role, search, page = 1, limit = 10 } = queryDto;
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

    if (role) {
      where.userRoles = {
        some: {
          role: {
            name: role,
          },
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
            include: {
              role: true,
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
}
