import {
  Controller,
  Delete,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { RegisterTokenDto } from './dto/register-token.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  /** Register / update push token */
  @Post('register-token')
  async registerToken(@Req() req: any, @Body() dto: RegisterTokenDto) {
    await this.notificationsService.registerToken(req.user.id, dto.pushToken);
    return { success: true };
  }

  /** Get user's notifications */
  @Get()
  async getNotifications(@Req() req: any) {
    return this.notificationsService.getUserNotifications(req.user.id);
  }

  /** Get unread count */
  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { count };
  }

  /** Mark single notification as read */
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    await this.notificationsService.markAsRead(id, req.user.id);
    return { success: true };
  }

  /** Mark all as read */
  @Patch('read-all')
  async markAllAsRead(@Req() req: any) {
    await this.notificationsService.markAllAsRead(req.user.id);
    return { success: true };
  }

  /** Clear all notifications */
  @Delete('clear-all')
  async clearAll(@Req() req: any) {
    await this.notificationsService.clearAll(req.user.id);
    return { success: true };
  }

  /** Driver nearby — called from mobile geofence */
  @Post('driver-nearby')
  async driverNearby(@Req() req: any, @Body() body: { reservationId: string }) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: body.reservationId },
      include: {
        parkingSpace: {
          include: {
            parkingLocation: { include: { host: true } },
          },
        },
        driver: { include: { user: true } },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    const hostUserId = reservation.parkingSpace.parkingLocation.host.userId;
    const driverUserId = reservation.driver.user.id;
    const driverName =
      [reservation.driver.user.firstName, reservation.driver.user.lastName]
        .filter(Boolean)
        .join(' ') || 'A driver';
    const locationTitle = reservation.parkingSpace.parkingLocation.title;

    await this.notificationsService.notifyDriverNearby(
      hostUserId,
      driverUserId,
      driverName,
      locationTitle,
      body.reservationId,
    );

    return { success: true };
  }

  /** Driver arrived — called from mobile proximity detection */
  @Post('driver-arrived')
  async driverArrived(@Req() req: any, @Body() body: { reservationId: string }) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: body.reservationId },
      include: {
        parkingSpace: {
          include: {
            parkingLocation: true,
          },
        },
        driver: { include: { user: true } },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    const driverUserId = reservation.driver.user.id;
    const locationTitle = reservation.parkingSpace.parkingLocation.title;

    await this.notificationsService.notifyDriverArrived(
      driverUserId,
      locationTitle,
      body.reservationId,
    );

    return { success: true };
  }
}
