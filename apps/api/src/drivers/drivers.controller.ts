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
  Request,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { S3Service } from '../common/s3.service';
import { DriversService } from './drivers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateDriverProfileDto } from './dto/create-driver-profile.dto';
import { UpdateDriverProfileDto } from './dto/update-driver-profile.dto';
import { QueryDriversDto } from './dto/query-drivers.dto';
import { UpdateDriverStatusDto } from './dto/update-driver-status.dto';
import { CreateDriverVehicleDto } from './dto/create-driver-vehicle.dto';
import { UpdateDriverVehicleDto } from './dto/update-driver-vehicle.dto';
import { QueryDriverVehiclesDto } from './dto/query-driver-vehicles.dto';

@ApiTags('Drivers')
@ApiBearerAuth('JWT-auth')
@Controller('drivers')
export class DriversController {
  constructor(
    private readonly driversService: DriversService,
    private readonly s3: S3Service,
  ) {}

  // ========== DRIVER PROFILE ENDPOINTS ==========

  @Post('upload-license')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload driver license image' })
  @ApiResponse({ status: 201, description: 'License image uploaded' })
  async uploadLicenseImage(
    @Request() req: { user: { id: string } },
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

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only JPEG, PNG, and WebP images are allowed',
      );
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size must not exceed 5MB');
    }

    // Delete old license image from S3 if exists
    const driver = await this.driversService.getDriverProfileSafe(req.user.id);
    if (driver?.licenseImageUrl) {
      await this.s3
        .deleteByUrl(driver.licenseImageUrl)
        .catch((err) =>
          console.warn('Failed to delete old license image:', err),
        );
    }

    const parts = file.originalname.split('.');
    const fileExt: string = parts.length > 1 ? parts[parts.length - 1] : 'jpg';

    const key = this.s3.driverLicenseKey(req.user.id, fileExt);
    await this.s3.upload(key, file.buffer, file.mimetype);

    const url = this.s3.buildUrl(key, true);

    return { url };
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Apply as driver or update driver profile' })
  @ApiResponse({
    status: 201,
    description: 'Driver application submitted successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async applyAsDriver(
    @Request() req,
    @Body() createDriverDto: CreateDriverProfileDto,
  ) {
    return this.driversService.applyAsDriver(req.user.id, createDriverDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DRIVER')
  @ApiOperation({ summary: 'Get current driver profile' })
  @ApiResponse({
    status: 200,
    description: 'Driver profile retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Driver profile not found' })
  async getDriverProfile(@Request() req) {
    return this.driversService.getDriverProfile(req.user.id);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DRIVER')
  @ApiOperation({ summary: 'Update driver profile' })
  @ApiResponse({
    status: 200,
    description: 'Driver profile updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Driver profile not found' })
  async updateDriverProfile(
    @Request() req,
    @Body() updateDriverDto: UpdateDriverProfileDto,
  ) {
    return this.driversService.updateDriverProfile(
      req.user.id,
      updateDriverDto,
    );
  }

  // ========== VEHICLE MANAGEMENT ENDPOINTS ==========

  @Post('vehicles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DRIVER')
  @ApiOperation({ summary: 'Add a new vehicle' })
  @ApiResponse({ status: 201, description: 'Vehicle added successfully' })
  @ApiResponse({ status: 400, description: 'Invalid vehicle data' })
  @ApiResponse({ status: 409, description: 'Vehicle already exists' })
  async addVehicle(
    @Request() req,
    @Body() createVehicleDto: CreateDriverVehicleDto,
  ) {
    return this.driversService.addVehicle(req.user.id, createVehicleDto);
  }

  @Get('vehicles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DRIVER')
  @ApiOperation({ summary: 'Get driver vehicles' })
  @ApiResponse({
    status: 200,
    description: 'Vehicles retrieved successfully',
  })
  async getDriverVehicles(
    @Request() req,
    @Query() queryDto: QueryDriverVehiclesDto,
  ) {
    return this.driversService.getDriverVehicles(req.user.id, queryDto);
  }

  @Put('vehicles/:vehicleId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DRIVER')
  @ApiOperation({ summary: 'Update vehicle information' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  @ApiResponse({ status: 200, description: 'Vehicle updated successfully' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async updateVehicle(
    @Request() req,
    @Param('vehicleId') vehicleId: string,
    @Body() updateVehicleDto: UpdateDriverVehicleDto,
  ) {
    return this.driversService.updateVehicle(
      req.user.id,
      vehicleId,
      updateVehicleDto,
    );
  }

  @Post('vehicles/:vehicleId/upload-registration')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DRIVER')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload vehicle Certificate of Registration image' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  @ApiResponse({ status: 201, description: 'Registration image uploaded' })
  async uploadVehicleRegistration(
    @Request() req: { user: { id: string } },
    @Param('vehicleId') vehicleId: string,
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ) {
    if (!file) throw new BadRequestException('No file uploaded');

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, and WebP images are allowed');
    }

    const vehicle = await this.driversService.getVehicleById(vehicleId);
    const plate = vehicle?.plateNumber ?? vehicleId;
    const ext = file.originalname.split('.').pop() ?? 'jpg';
    const key = this.s3.vehicleRegistrationKey(plate, ext);

    if (vehicle?.registrationImageUrl) {
      await this.s3.deleteByUrl(vehicle.registrationImageUrl).catch(() => {});
    }

    await this.s3.upload(key, file.buffer, file.mimetype);
    const url = this.s3.buildUrl(key, true);

    await this.driversService.setVehicleRegistration(req.user.id, vehicleId, url);
    return { url };
  }

  @Delete('vehicles/:vehicleId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DRIVER')
  @ApiOperation({ summary: 'Soft-delete vehicle' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  @ApiResponse({ status: 200, description: 'Vehicle deleted successfully' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async deleteVehicle(@Request() req, @Param('vehicleId') vehicleId: string) {
    return this.driversService.deleteVehicle(req.user.id, vehicleId);
  }

  // ========== ADMIN ENDPOINTS ==========

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all drivers (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Drivers retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getAllDrivers(@Query() queryDto: QueryDriversDto) {
    return this.driversService.getAllDrivers(queryDto);
  }

  @Put('admin/vehicles/:vehicleId/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Approve or reject a vehicle registration (Admin only)' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  @ApiResponse({ status: 200, description: 'Vehicle verification updated' })
  async adminVerifyVehicle(
    @Param('vehicleId') vehicleId: string,
    @Body() body: { action: 'APPROVED' | 'REJECTED'; rejectionReason?: string },
  ) {
    return this.driversService.adminVerifyVehicle(vehicleId, body.action, body.rejectionReason);
  }

  @Put('admin/:driverId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update driver verification status (Admin only)' })
  @ApiParam({ name: 'driverId', description: 'Driver ID' })
  @ApiResponse({
    status: 200,
    description: 'Driver status updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async updateDriverStatus(
    @Param('driverId') driverId: string,
    @Body() updateStatusDto: UpdateDriverStatusDto,
  ) {
    return this.driversService.updateDriverStatus(driverId, updateStatusDto);
  }

  // UNUSED ADMIN ENDPOINT — not called by the admin dashboard
  // @Get('admin/statistics')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN')
  // @ApiOperation({ summary: 'Get driver statistics (Admin only)' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Driver statistics retrieved successfully',
  // })
  // @ApiResponse({ status: 403, description: 'Admin access required' })
  // async getDriverStatistics() {
  //   return this.driversService.getDriverStatistics();
  // }
}
