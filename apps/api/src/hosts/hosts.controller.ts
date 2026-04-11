import { randomUUID } from 'crypto';
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
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
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
import { FilesInterceptor } from '@nestjs/platform-express';
import { S3Service } from '../common/s3.service';

@ApiTags('Hosts')
@ApiBearerAuth()
@Controller('hosts')
@UseGuards(JwtAuthGuard)
export class HostsController {
  constructor(
    private readonly hostsService: HostsService,
    private readonly s3: S3Service,
  ) {}

  // Upload parking location images to S3
  @Post('upload-images')
  @UseGuards(RolesGuard)
  @Roles(RoleName.HOST)
  @UseInterceptors(
    FilesInterceptor('files', 5, { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  @ApiOperation({ summary: 'Upload parking location images to S3' })
  @ApiResponse({ status: 201, description: 'Images uploaded successfully' })
  async uploadImages(
    @UploadedFiles()
    files: Array<{ originalname: string; buffer: Buffer; mimetype: string }>,
    @Body('locationName') locationName?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const name = locationName || 'location';
    const batchId = randomUUID().split('-')[0];
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt: string = file.originalname.split('.').pop() ?? 'jpg';
      const key = this.s3.parkingImageKey(`${name}-${batchId}`, i, fileExt);
      const url = await this.s3.upload(key, file.buffer, file.mimetype);
      urls.push(url);
    }

    return { urls };
  }

  // Upload proof of residence document to S3
  @Post('upload-proof-of-residence')
  @UseGuards(RolesGuard)
  @Roles(RoleName.HOST)
  @UseInterceptors(FilesInterceptor('files', 1))
  @ApiOperation({ summary: 'Upload proof of residence document to S3' })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  async uploadProofOfResidence(
    @UploadedFiles()
    files: Array<{ originalname: string; buffer: Buffer; mimetype: string }>,
    @Body('locationName') locationName?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No file uploaded');
    }

    const file = files[0];
    const name = locationName || 'location';
    const uniqueId = randomUUID().split('-')[0];
    const fileExt: string = file.originalname.split('.').pop() ?? 'jpg';
    const key = this.s3.proofOfResidenceKey(`${name}-${uniqueId}`, fileExt);
    const url = await this.s3.upload(key, file.buffer, file.mimetype);

    return { url };
  }

  // Public: Browse approved parking locations (any logged-in user)
  @Get('parking/nearby')
  @ApiOperation({ summary: 'Get approved parking locations for browsing' })
  @ApiResponse({
    status: 200,
    description: 'Approved parking locations retrieved',
  })
  async getNearbyLocations(
    @Query('latitude') latitude?: number,
    @Query('longitude') longitude?: number,
    @Query('radius') radius?: number,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
  ) {
    return this.hostsService.getApprovedLocations({
      latitude: latitude !== undefined ? +latitude : undefined,
      longitude: longitude !== undefined ? +longitude : undefined,
      radius: radius !== undefined ? +radius : undefined,
      search,
      limit: limit !== undefined ? +limit : undefined,
    });
  }

  // Public: Get single approved parking location details
  @Get('parking/:id')
  @ApiOperation({ summary: 'Get single approved parking location details' })
  @ApiResponse({ status: 200, description: 'Location details retrieved' })
  async getPublicLocation(@Param('id', ParseUUIDPipe) locationId: string) {
    return this.hostsService.getApprovedLocationById(locationId);
  }

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

  // Toggle parking location (enable/disable)
  @Put('locations/:id/toggle')
  @UseGuards(RolesGuard)
  @Roles(RoleName.HOST)
  @ApiOperation({ summary: 'Toggle parking location (approved/disabled)' })
  @ApiResponse({ status: 200, description: 'Location status toggled' })
  async toggleLocation(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) locationId: string,
  ) {
    return this.hostsService.toggleParkingLocation(req.user.id, locationId);
  }

  // Toggle parking space (enable/disable)
  @Put('spaces/:id/toggle')
  @UseGuards(RolesGuard)
  @Roles(RoleName.HOST)
  @ApiOperation({ summary: 'Toggle parking space status (available/disabled)' })
  @ApiResponse({ status: 200, description: 'Space status toggled' })
  async toggleSpace(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) spaceId: string,
  ) {
    return this.hostsService.toggleParkingSpace(req.user.id, spaceId);
  }

  // Delete parking space
  @Delete('spaces/:id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.HOST)
  @ApiOperation({ summary: 'Delete a parking space' })
  @ApiResponse({ status: 200, description: 'Space deleted successfully' })
  async deleteSpace(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) spaceId: string,
  ) {
    return this.hostsService.deleteParkingSpace(req.user.id, spaceId);
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
