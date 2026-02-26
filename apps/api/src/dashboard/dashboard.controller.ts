import {
  Controller,
  Get,
  UseGuards,
  Query,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName, ReservationStatus } from '@prisma/client';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Roles(RoleName.ADMIN)
  async getStats() {
    return this.dashboardService.getStats();
  }

  @Get('recent-listings')
  @Roles(RoleName.ADMIN)
  async getRecentListings(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 5;
    return this.dashboardService.getRecentListings(parsedLimit);
  }

  @Get('recent-activity')
  @Roles(RoleName.ADMIN)
  async getRecentActivity(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.dashboardService.getRecentActivity(parsedLimit);
  }

  @Get('financial-stats')
  @Roles(RoleName.ADMIN)
  async getFinancialStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.dashboardService.getFinancialStats(start, end);
  }

  @Get('recent-transactions')
  @Roles(RoleName.ADMIN)
  async getRecentTransactions(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.dashboardService.getRecentTransactions(parsedLimit);
  }

  @Get('revenue-trend')
  @Roles(RoleName.ADMIN)
  async getRevenueTrend(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.dashboardService.getRevenueTrend(start, end);
  }

  @Get('reservations/stats')
  @Roles(RoleName.ADMIN)
  async getReservationStats() {
    return this.dashboardService.getReservationStats();
  }

  @Get('reservations')
  @Roles(RoleName.ADMIN)
  async getReservations(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: ReservationStatus,
    @Query('search') search?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.dashboardService.getReservations(
      parsedPage,
      parsedLimit,
      status,
      search,
    );
  }

  @Get('reservations/:id')
  @Roles(RoleName.ADMIN)
  async getReservationById(@Param('id') id: string) {
    const reservation = await this.dashboardService.getReservationById(id);
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }
    return reservation;
  }
}
