import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  Query,
  Param,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from '@prisma/client';
import type { AuthenticatedRequest } from './types';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Get current user profile
  @Get('profile')
  async getProfile(@Request() req: AuthenticatedRequest) {
    return this.usersService.getProfile(req.user.userId);
  }

  // Update profile
  @Put('profile')
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(req.user.userId, updateProfileDto);
  }

  // Change password
  @Put('change-password')
  async changePassword(
    @Request() req: AuthenticatedRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(req.user.userId, changePasswordDto);
  }

  // Admin: Get all users
  @Get()
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  async getAllUsers(@Query() queryDto: QueryUsersDto) {
    return this.usersService.getAllUsers(queryDto);
  }

  // Admin: Update user status
  @Put(':id/status')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  async updateUserStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateUserStatus(id, updateStatusDto);
  }

  // Admin: Get statistics
  @Get('statistics')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  async getStatistics() {
    return this.usersService.getUserStatistics();
  }
}
