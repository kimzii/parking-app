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
import type { AuthenticatedRequest } from './types';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from '@prisma/client';

import { FileInterceptor } from '@nestjs/platform-express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

import { ConfigService } from '@nestjs/config';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {
    const region = this.configService.get<string>('AWS_REGION');
    const bucket = this.configService.get<string>('AWS_S3_BUCKET');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );

    if (!region || !bucket || !accessKeyId || !secretAccessKey) {
      throw new Error('AWS environment variables are not configured properly');
    }

    this.region = region;
    this.bucket = bucket;

    this.s3 = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

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

    // Use userId as key so re-uploads overwrite the existing file
    const key = `profile-pictures/${req.user.id}.${fileExt}`;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    await this.s3.send(command);

    // Add timestamp to bust image cache on the client
    const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}?t=${Date.now()}`;

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
