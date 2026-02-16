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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
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
  constructor(private readonly driversService: DriversService) {}

  // ========== DRIVER PROFILE ENDPOINTS ==========

  @Post('apply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DRIVER')
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

  @Delete('vehicles/:vehicleId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DRIVER')
  @ApiOperation({ summary: 'Delete/deactivate vehicle' })
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

  @Get('admin/statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get driver statistics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Driver statistics retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getDriverStatistics() {
    return this.driversService.getDriverStatistics();
  }
}
