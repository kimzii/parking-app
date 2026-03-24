import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly expo = new Expo();

  constructor(private prisma: PrismaService) {}

  /**
   * Send a push notification + persist it in the database
   */
  async send(params: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    data?: Record<string, any>;
  }) {
    const { userId, title, message, type, data } = params;

    // Persist in DB
    const notification = await this.prisma.notification.create({
      data: { userId, title, message, type, data: data ?? undefined },
    });

    // Send push notification
    await this.sendPush(userId, title, message, data);

    return notification;
  }

  /**
   * Send push to a user by userId (looks up their pushToken)
   */
  private async sendPush(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true },
    });

    if (!user?.pushToken || !Expo.isExpoPushToken(user.pushToken)) {
      this.logger.debug(
        `No valid push token for user ${userId}, skipping push`,
      );
      return;
    }

    const message: ExpoPushMessage = {
      to: user.pushToken,
      sound: 'default',
      title,
      body,
      data: data ?? {},
    };

    try {
      const [ticket] = await this.expo.sendPushNotificationsAsync([message]);
      this.logger.debug(`Push sent to ${userId}: ${JSON.stringify(ticket)}`);
    } catch (error) {
      this.logger.error(`Failed to send push to ${userId}:`, error);
    }
  }

  /**
   * Register / update a user's push token
   */
  async registerToken(userId: string, pushToken: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { pushToken },
    });
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(userId: string, limit = 50) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  // ──────────────────────────────────────────────
  // Convenience methods for specific notification types
  // ──────────────────────────────────────────────

  async notifyBookingCompleted(
    driverId: string,
    hostUserId: string,
    reservationId: string,
    locationTitle: string,
  ) {
    await Promise.all([
      this.send({
        userId: driverId,
        title: 'Booking Completed',
        message: `Your parking session at ${locationTitle} has been completed.`,
        type: 'BOOKING_COMPLETED',
        data: { reservationId },
      }),
      this.send({
        userId: hostUserId,
        title: 'Booking Completed',
        message: `A parking session at ${locationTitle} has been completed.`,
        type: 'BOOKING_COMPLETED',
        data: { reservationId },
      }),
    ]);
  }

  async notifyBookingCancelled(
    recipientUserId: string,
    reservationId: string,
    locationTitle: string,
    cancelledBy: 'driver' | 'host',
  ) {
    await this.send({
      userId: recipientUserId,
      title: 'Booking Cancelled',
      message:
        cancelledBy === 'driver'
          ? `A driver cancelled their booking at ${locationTitle}.`
          : `Your booking at ${locationTitle} has been cancelled by the host.`,
      type: 'BOOKING_CANCELLED',
      data: { reservationId },
    });
  }

  async notifyBookingPending(
    hostUserId: string,
    reservationId: string,
    locationTitle: string,
    driverName: string,
  ) {
    await this.send({
      userId: hostUserId,
      title: 'New Booking Request',
      message: `${driverName} has requested to park at ${locationTitle}. Tap to approve or reject.`,
      type: 'BOOKING_PENDING',
      data: { reservationId },
    });
  }

  async notifyDriverVerified(driverUserId: string) {
    await this.send({
      userId: driverUserId,
      title: 'Driver Verified',
      message:
        'Your driver account has been verified! You can now book parking spots.',
      type: 'DRIVER_VERIFIED',
    });
  }

  async notifyLocationApproved(hostUserId: string, locationTitle: string) {
    await this.send({
      userId: hostUserId,
      title: 'Location Approved',
      message: `Your parking location "${locationTitle}" has been approved and is now visible to drivers.`,
      type: 'LOCATION_APPROVED',
      data: { locationTitle },
    });
  }

  async notifyLocationRejected(
    hostUserId: string,
    locationTitle: string,
    reason?: string,
  ) {
    await this.send({
      userId: hostUserId,
      title: 'Location Rejected',
      message: reason
        ? `Your parking location "${locationTitle}" was rejected: ${reason}`
        : `Your parking location "${locationTitle}" was rejected.`,
      type: 'LOCATION_REJECTED',
      data: { locationTitle },
    });
  }

  async notifyBookingApproved(
    driverUserId: string,
    reservationId: string,
    locationTitle: string,
  ) {
    await this.send({
      userId: driverUserId,
      title: 'Booking Approved',
      message: `Your booking at ${locationTitle} has been approved! You have 60 minutes to arrive.`,
      type: 'BOOKING_APPROVED',
      data: { reservationId },
    });
  }

  async notifyDriverNearby(
    hostUserId: string,
    driverName: string,
    locationTitle: string,
    reservationId: string,
  ) {
    await this.send({
      userId: hostUserId,
      title: 'Driver Approaching',
      message: `${driverName} is near ${locationTitle}. Get ready!`,
      type: 'DRIVER_NEARBY',
      data: { reservationId },
    });
  }
}
