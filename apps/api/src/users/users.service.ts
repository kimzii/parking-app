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
        status: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
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

    return {
      ...user,
      roles: user.userRoles.map((ur) => ur.role.name),
      userRoles: undefined,
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
        status: true,
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
    const { status, role, search, page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    if (status) {
      where.status = status;
    }

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
          status: true,
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
      userRoles: undefined,
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

  // Admin: Update user status
  async updateUserStatus(userId: string, updateStatusDto: UpdateUserStatusDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: updateStatusDto.status,
      },
      select: {
        id: true,
        email: true,
        status: true,
        updatedAt: true,
      },
    });

    return {
      message: `User status updated to ${updateStatusDto.status}`,
      user: updatedUser,
    };
  }

  // Admin: Get user statistics
  async getUserStatistics() {
    const [total, pending, approved, blocked, drivers, hosts, admins] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { status: 'PENDING' } }),
        this.prisma.user.count({ where: { status: 'APPROVED' } }),
        this.prisma.user.count({ where: { status: 'BLOCKED' } }),
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
      byStatus: {
        pending,
        approved,
        blocked,
      },
      byRole: {
        drivers,
        hosts,
        admins,
      },
    };
  }
}
