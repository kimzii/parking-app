import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { HostsService } from './hosts.service';
import { CreateParkingLocationDto } from './dto/create-parking-location.dto';
import { UpdateParkingLocationDto } from './dto/update-parking-location.dto';
import { QueryParkingLocationsDto } from './dto/query-parking-locations.dto';
import { UpdateLocationStatusDto } from './dto/update-location-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from '@prisma/client';
import type { AuthenticatedRequest } from '../users/types/request.type';

@ApiTags('Hosts')
@ApiBearerAuth()
@Controller('hosts')
@UseGuards(JwtAuthGuard)
export class HostsController {
  constructor(private readonly hostsService: HostsService) {}

  // Become a host (no HOST role required - this is how users get the role)
  @Post('become')
  @ApiOperation({ summary: 'Register current user as a host' })
  @ApiResponse({ status: 201, description: 'Successfully registered as host' })
  @ApiResponse({ status: 400, description: 'User already has HOST role' })
  async becomeHost(@Req() req: AuthenticatedRequest) {
    return this.hostsService.becomeHost(req.user.id);
  }

  // Get host profile
  @Get('profile')
  @UseGuards(RolesGuard)
  @Roles(RoleName.HOST)
  @ApiOperation({ summary: 'Get host profile with parking locations' })
  @ApiResponse({
    status: 200,
    description: 'Host profile retrieved successfully',
  })
  async getProfile(@Req() req: AuthenticatedRequest) {
    return this.hostsService.getHostProfile(req.user.id);
  }

  // Create host profile (auto-called when needed)
  @Post('profile')
  @UseGuards(RolesGuard)
  @Roles(RoleName.HOST)
  @ApiOperation({ summary: 'Create host profile if not exists' })
  @ApiResponse({
    status: 201,
    description: 'Host profile created successfully',
  })
  async createProfile(@Req() req: AuthenticatedRequest) {
    return this.hostsService.createHostProfile(req.user.id);
  }

  // Get host statistics
  @Get('statistics')
  @UseGuards(RolesGuard)
  @Roles(RoleName.HOST)
  @ApiOperation({ summary: 'Get host statistics' })
  @ApiResponse({
    status: 200,
    description: 'Host statistics retrieved successfully',
  })
  async getStatistics(@Req() req: AuthenticatedRequest) {
    return this.hostsService.getHostStatistics(req.user.id);
  }

  // Create parking location
  @Post('locations')
  @UseGuards(RolesGuard)
  @Roles(RoleName.HOST)
  @ApiOperation({ summary: 'Create new parking location' })
  @ApiResponse({
    status: 201,
    description: 'Parking location created successfully',
  })
  async createLocation(
    @Req() req: AuthenticatedRequest,
    @Body() createLocationDto: CreateParkingLocationDto,
  ) {
    return this.hostsService.createParkingLocation(
      req.user.id,
      createLocationDto,
    );
  }

  // Get host's parking locations
  @Get('locations')
  @UseGuards(RolesGuard)
  @Roles(RoleName.HOST)
  @ApiOperation({ summary: 'Get host parking locations with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Parking locations retrieved successfully',
  })
  async getLocations(
    @Req() req: AuthenticatedRequest,
    @Query() queryDto: QueryParkingLocationsDto,
  ) {
    return this.hostsService.getHostParkingLocations(req.user.id, queryDto);
  }

  // Get single parking location
  @Get('locations/:id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.HOST)
  @ApiOperation({ summary: 'Get single parking location details' })
  @ApiResponse({
    status: 200,
    description: 'Parking location retrieved successfully',
  })
  async getLocation(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) locationId: string,
  ) {
    return this.hostsService.getParkingLocation(req.user.id, locationId);
  }

  // Update parking location
  @Put('locations/:id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.HOST)
  @ApiOperation({ summary: 'Update parking location' })
  @ApiResponse({
    status: 200,
    description: 'Parking location updated successfully',
  })
  async updateLocation(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) locationId: string,
    @Body() updateLocationDto: UpdateParkingLocationDto,
  ) {
    return this.hostsService.updateParkingLocation(
      req.user.id,
      locationId,
      updateLocationDto,
    );
  }

  // Delete parking location
  @Delete('locations/:id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.HOST)
  @ApiOperation({ summary: 'Delete parking location' })
  @ApiResponse({
    status: 200,
    description: 'Parking location deleted successfully',
  })
  async deleteLocation(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) locationId: string,
  ) {
    return this.hostsService.deleteParkingLocation(req.user.id, locationId);
  }

  // Admin endpoints
  @Get('admin/locations')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Admin: Get all parking locations for review' })
  @ApiResponse({
    status: 200,
    description: 'All parking locations retrieved successfully',
  })
  async getAllLocations(@Query() queryDto: QueryParkingLocationsDto) {
    return this.hostsService.getAllParkingLocations(queryDto);
  }

  @Put('admin/locations/:id/status')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Admin: Update parking location status' })
  @ApiResponse({
    status: 200,
    description: 'Location status updated successfully',
  })
  async updateLocationStatus(
    @Param('id', ParseUUIDPipe) locationId: string,
    @Body() updateStatusDto: UpdateLocationStatusDto,
  ) {
    return this.hostsService.updateLocationStatus(locationId, updateStatusDto);
  }
}
