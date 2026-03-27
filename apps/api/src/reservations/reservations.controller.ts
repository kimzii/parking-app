import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReservationsService } from './reservations.service';
import {
  CreateReservationDto,
  VerifyScanDto,
} from './dto/create-reservation.dto';

@Controller('reservations')
@UseGuards(JwtAuthGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  /**
   * Get first-hour fee info for a parking space
   */
  @Get('first-hour-fee/:parkingSpaceId')
  async getFirstHourFee(@Param('parkingSpaceId') parkingSpaceId: string) {
    return this.reservationsService.getFirstHourFee(parkingSpaceId);
  }

  /**
   * Create a new reservation (Driver) — pays 1st hour, then waits for host approval
   */
  @Post()
  async createReservation(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateReservationDto,
  ) {
    return this.reservationsService.createReservation(req.user.id, dto);
  }

  /**
   * Get my reservations (Driver)
   */
  @Get('my-reservations')
  async getMyReservations(
    @Request() req: { user: { id: string } },
    @Query('status') status?: string,
  ) {
    return this.reservationsService.getDriverReservations(req.user.id, status);
  }

  /**
   * Get a single reservation by ID
   */
  @Get(':id')
  async getReservation(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.reservationsService.getReservation(req.user.id, id);
  }

  /**
   * Cancel a reservation (Driver — before session starts)
   */
  @Post(':id/cancel')
  async cancelReservation(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.reservationsService.cancelReservation(req.user.id, id);
  }

  /**
   * Host: Approve a pending reservation
   */
  @Post('host/:id/approve')
  async approveReservation(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.reservationsService.approveReservation(req.user.id, id);
  }

  /**
   * Host: Reject a pending reservation
   */
  @Post('host/:id/reject')
  async rejectReservation(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.reservationsService.rejectReservation(req.user.id, id);
  }

  /**
   * Host: Scan QR code for entry — starts parking session
   */
  @Post('scan/entry')
  async scanEntry(
    @Request() req: { user: { id: string } },
    @Body() dto: VerifyScanDto,
  ) {
    return this.reservationsService.verifyEntryQR(req.user.id, dto.qrCode, dto.force);
  }

  /**
   * Host: Scan QR code for exit — ends session, calculates + settles payment
   */
  @Post('scan/exit')
  async scanExit(
    @Request() req: { user: { id: string } },
    @Body() dto: VerifyScanDto,
  ) {
    return this.reservationsService.verifyExitQR(req.user.id, dto.qrCode);
  }

  /**
   * Host: Get reservations for my locations
   */
  @Get('host/reservations')
  async getHostReservations(
    @Request() req: { user: { id: string } },
    @Query('locationId') locationId?: string,
    @Query('status') status?: string,
  ) {
    return this.reservationsService.getHostReservations(
      req.user.id,
      locationId,
      status,
    );
  }

  /**
   * Host: Get a single reservation by ID
   */
  @Get('host/reservations/:id')
  async getHostReservation(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.reservationsService.getHostReservation(req.user.id, id);
  }
}
