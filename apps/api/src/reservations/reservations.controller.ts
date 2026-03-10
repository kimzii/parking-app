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
  CalculateFeeDto,
} from './dto/create-reservation.dto';

@Controller('reservations')
@UseGuards(JwtAuthGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  /**
   * Calculate parking fee without creating a reservation
   */
  @Post('calculate-fee')
  async calculateFee(@Body() dto: CalculateFeeDto) {
    return this.reservationsService.calculateFee(dto);
  }

  /**
   * Create a new reservation (Driver)
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
   * Cancel a reservation (Driver)
   */
  @Post(':id/cancel')
  async cancelReservation(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.reservationsService.cancelReservation(req.user.id, id);
  }

  /**
   * Host: Scan QR code for entry
   */
  @Post('scan/entry')
  async scanEntry(
    @Request() req: { user: { id: string } },
    @Body() dto: VerifyScanDto,
  ) {
    return this.reservationsService.verifyEntryQR(req.user.id, dto.qrCode);
  }

  /**
   * Host: Scan QR code for exit
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
}
