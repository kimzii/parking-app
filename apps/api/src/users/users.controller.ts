import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  Query,
  Param,
  Post,
  Delete,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';

import { UsersService } from './users.service';

import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import type { AuthenticatedRequest } from './types';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from '@prisma/client';

import { FileInterceptor } from '@nestjs/platform-express';
import { S3Service } from '../common/s3.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly s3: S3Service,
  ) {}

  // Get current user profile
  @Get('profile')
  async getProfile(@Request() req: AuthenticatedRequest) {
    return this.usersService.getProfile(req.user.id);
  }

  // Update profile
  @Put('profile')
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(req.user.id, updateProfileDto);
  }

  // Upload profile picture
  @Post('upload-profile-picture')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfilePicture(
    @Request() req: AuthenticatedRequest,
    @UploadedFile()
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only JPEG, PNG, and WebP images are allowed',
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size must not exceed 5MB');
    }

    const parts = file.originalname.split('.');
    const fileExt: string = parts.length > 1 ? parts[parts.length - 1] : 'jpg';

    // Delete old profile picture from S3 if exists
    const profile = await this.usersService.getProfile(req.user.id);
    if (profile.profilePicture) {
      await this.s3
        .deleteByUrl(profile.profilePicture)
        .catch((err) =>
          console.warn('Failed to delete old profile picture:', err),
        );
    }

    const key = this.s3.profilePictureKey(req.user.id, fileExt);
    await this.s3.upload(key, file.buffer, file.mimetype);

    // Add timestamp to bust image cache on the client
    const url = this.s3.buildUrl(key, true);

    // Save the profile picture URL to the user's profile
    await this.usersService.updateProfile(req.user.id, { profilePicture: url });

    return { url };
  }

  // Change password
  @Put('change-password')
  async changePassword(
    @Request() req: AuthenticatedRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(req.user.id, changePasswordDto);
  }

  // Admin: Get all users
  @Get()
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  async getAllUsers(@Query() queryDto: QueryUsersDto) {
    return this.usersService.getAllUsers(queryDto);
  }

  // Admin: Update user status
  @Put(':id/roles/:roleId/status')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  async updateUserRoleStatus(
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @Body() updateStatusDto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateUserRoleStatus(id, roleId, updateStatusDto);
  }

  // Admin: Get statistics
  @Get('statistics')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  async getStatistics() {
    return this.usersService.getUserStatistics();
  }

  // Admin: Create a new admin user
  @Post('admin/create')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  async createAdmin(@Body() createAdminDto: CreateAdminDto) {
    return this.usersService.createAdmin(createAdminDto);
  }

  // Admin: Get user by ID with full details
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  async getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  // Admin: Update user profile fields by ID
  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  async updateUserById(
    @Param('id') id: string,
    @Body() updateUserDto: AdminUpdateUserDto,
  ) {
    return this.usersService.updateUserByAdmin(id, updateUserDto);
  }

  // Admin: Delete user
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  async deleteUser(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.usersService.deleteUser(id, req.user.id);
  }
}
