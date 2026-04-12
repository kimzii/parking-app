import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { NotificationType } from '@prisma/client';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly expo = new Expo();

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsGateway))
    private gateway: NotificationsGateway,
  ) {}

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

    // Send real-time via Socket.IO
    this.gateway.sendToUser(userId, notification);

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

    if (!user?.pushToken) {
      this.logger.warn(`No push token for user ${userId}, skipping push`);
      return;
    }

    if (!Expo.isExpoPushToken(user.pushToken)) {
      this.logger.warn(
        `Invalid push token for user ${userId}: ${user.pushToken}`,
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

    this.logger.log(
      `Sending push to ${userId} (token: ${user.pushToken}): "${title}"`,
    );

    try {
      const [ticket] = await this.expo.sendPushNotificationsAsync([message]);
      this.logger.log(`Push ticket for ${userId}: ${JSON.stringify(ticket)}`);
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

  /**
   * Delete all notifications for a user
   */
  async clearAll(userId: string) {
    return this.prisma.notification.deleteMany({
      where: { userId },
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
        data: { reservationId, screen: 'reservation-qr' },
      }),
      this.send({
        userId: hostUserId,
        title: 'Booking Completed',
        message: `A parking session at ${locationTitle} has been completed.`,
        type: 'BOOKING_COMPLETED',
        data: { reservationId, screen: 'host-reservation-detail' },
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
      data: {
        reservationId,
        screen:
          cancelledBy === 'driver'
            ? 'host-reservation-detail'
            : 'reservation-qr',
      },
    });
  }

  async notifyBookingCancelledByAdmin(
    driverUserId: string,
    hostUserId: string,
    reservationId: string,
    locationTitle: string,
    reason?: string,
  ) {
    const reasonSuffix = reason ? ` Reason: ${reason}` : '';

    await Promise.all([
      this.send({
        userId: driverUserId,
        title: 'Session Cancelled by Admin',
        message: `Your parking session at ${locationTitle} has been cancelled by an administrator.${reasonSuffix}`,
        type: 'BOOKING_CANCELLED_BY_ADMIN',
        data: {
          reservationId,
          cancelledBy: 'admin',
          screen: 'reservation-qr',
        },
      }),
      this.send({
        userId: hostUserId,
        title: 'Session Cancelled by Admin',
        message: `A parking session at ${locationTitle} has been cancelled by an administrator.${reasonSuffix}`,
        type: 'BOOKING_CANCELLED_BY_ADMIN',
        data: {
          reservationId,
          cancelledBy: 'admin',
          screen: 'host-reservation-detail',
        },
      }),
    ]);
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
      data: { reservationId, screen: 'host-reservation-detail' },
    });
  }

  async notifyDriverVerified(driverUserId: string) {
    await this.send({
      userId: driverUserId,
      title: 'Driver Verified',
      message:
        'Your driver account has been verified! You can now book parking spots.',
      type: 'DRIVER_VERIFIED',
      data: { screen: 'my-reservations' },
    });
  }

  async notifyDriverRejected(driverUserId: string, reason?: string) {
    await this.send({
      userId: driverUserId,
      title: 'Driver Verification Rejected',
      message: reason
        ? `Your driver account verification was rejected. Reason: ${reason}`
        : 'Your driver account verification was rejected. Please review your submitted documents and try again.',
      type: 'DRIVER_REJECTED',
      data: { screen: 'profile' },
    });
  }

  async notifyHostVerified(hostUserId: string) {
    await this.send({
      userId: hostUserId,
      title: 'Host Account Verified',
      message:
        'Your host account has been verified! You can now list parking spaces.',
      type: 'HOST_VERIFIED',
      data: { screen: 'host-home' },
    });
  }

  async notifyLocationApproved(
    hostUserId: string,
    locationTitle: string,
    locationId: string,
  ) {
    await this.send({
      userId: hostUserId,
      title: 'Location Approved',
      message: `Your parking location "${locationTitle}" has been approved and is now visible to drivers.`,
      type: 'LOCATION_APPROVED',
      data: { locationId, screen: 'location-detail' },
    });
  }

  async notifyLocationRejected(
    hostUserId: string,
    locationTitle: string,
    locationId: string,
    reason?: string,
  ) {
    await this.send({
      userId: hostUserId,
      title: 'Location Rejected',
      message: reason
        ? `Your parking location "${locationTitle}" was rejected: ${reason}`
        : `Your parking location "${locationTitle}" was rejected.`,
      type: 'LOCATION_REJECTED',
      data: { locationId, screen: 'location-detail' },
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
      data: { reservationId, screen: 'reservation-qr' },
    });
  }

  async notifyDriverArrived(
    hostUserId: string,
    driverUserId: string,
    driverName: string,
    locationTitle: string,
    reservationId: string,
  ) {
    await Promise.all([
      this.send({
        userId: driverUserId,
        title: 'You Have Arrived!',
        message: `You've reached ${locationTitle}. Please proceed to your parking spot.`,
        type: 'DRIVER_ARRIVED',
        data: { reservationId, screen: 'reservation-qr' },
      }),
      this.send({
        userId: hostUserId,
        title: 'Driver Has Arrived',
        message: `${driverName} has arrived at ${locationTitle} and is ready to park.`,
        type: 'DRIVER_ARRIVED',
        data: { reservationId, screen: 'host-reservation-detail' },
      }),
    ]);
  }

  async notifyDriverNearby(
    hostUserId: string,
    driverUserId: string,
    driverName: string,
    locationTitle: string,
    reservationId: string,
  ) {
    await Promise.all([
      this.send({
        userId: hostUserId,
        title: 'Driver Approaching',
        message: `${driverName} is near ${locationTitle}. Get ready!`,
        type: 'DRIVER_NEARBY',
        data: { reservationId, screen: 'host-reservation-detail' },
      }),
      this.send({
        userId: driverUserId,
        title: 'Almost There!',
        message: `You're close to ${locationTitle}. Your parking spot is nearby!`,
        type: 'DRIVER_NEARBY',
        data: { reservationId, screen: 'reservation-qr' },
      }),
    ]);
  }

  private async getAdminUserIds(): Promise<string[]> {
    const admins = await this.prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: { name: 'ADMIN' },
            status: 'VERIFIED',
          },
        },
      },
      select: { id: true },
    });

    return admins.map((admin) => admin.id);
  }

  async notifyAdminsPendingListing(
    locationId: string,
    locationTitle: string,
  ): Promise<void> {
    const adminIds = await this.getAdminUserIds();

    if (adminIds.length === 0) {
      return;
    }

    await Promise.all(
      adminIds.map((adminId) =>
        this.send({
          userId: adminId,
          title: 'New Listing For Approval',
          message: `A new listing "${locationTitle}" is waiting for approval.`,
          type: 'GENERAL',
          data: { kind: 'PENDING_LISTING', locationId },
        }),
      ),
    );
  }

  async notifyAdminsPendingDriver(driverId: string): Promise<void> {
    const adminIds = await this.getAdminUserIds();

    if (adminIds.length === 0) {
      return;
    }

    await Promise.all(
      adminIds.map((adminId) =>
        this.send({
          userId: adminId,
          title: 'New Driver For Approval',
          message: 'A new driver application is waiting for approval.',
          type: 'GENERAL',
          data: { kind: 'PENDING_DRIVER', driverId },
        }),
      ),
    );
  }

  async notifyVehicleApproved(driverUserId: string, plateNumber: string) {
    await this.send({
      userId: driverUserId,
      title: 'Vehicle Approved',
      message: `Your vehicle (${plateNumber}) has been verified and is now ready for booking.`,
      type: 'VEHICLE_APPROVED',
      data: { screen: 'my-vehicles' },
    });
  }

  async notifyVehicleRejected(driverUserId: string, plateNumber: string, reason?: string) {
    await this.send({
      userId: driverUserId,
      title: 'Vehicle Registration Rejected',
      message: reason
        ? `Your vehicle (${plateNumber}) registration was rejected. Reason: ${reason}`
        : `Your vehicle (${plateNumber}) registration was rejected. Please re-upload a valid Certificate of Registration.`,
      type: 'VEHICLE_REJECTED',
      data: { screen: 'my-vehicles' },
    });
  }
}
