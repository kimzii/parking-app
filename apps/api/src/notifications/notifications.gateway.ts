import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      // Join a room named after the user's ID
      client.join(userId);
      client.data.userId = userId;
      this.logger.log(`User ${userId} connected (socket: ${client.id})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Emit a new notification to a specific user in real-time
   */
  sendToUser(userId: string, notification: any) {
    this.server.to(userId).emit('notification', notification);
  }

  /**
   * Emit a wallet balance update to a specific user
   */
  sendBalanceUpdate(userId: string, balance: string) {
    this.server.to(userId).emit('balance-update', { balance });
  }

  /**
   * Emit an available slot count update to all clients viewing a specific location
   */
  sendSlotUpdate(locationId: string, availableSlots: number, spaceId?: string, spaceStatus?: string) {
    // Broadcast globally so both the home screen (spots list) and
    // the booking screen (space grid) receive the update.
    this.server.emit('slot-update', {
      locationId,
      availableSlots,
      ...(spaceId && { spaceId, spaceStatus }),
    });
  }

  /**
   * Allow clients to join a location-specific room to receive slot updates
   */
  @SubscribeMessage('join-location')
  handleJoinLocation(
    @MessageBody() locationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`location:${locationId}`);
  }

  /**
   * Emit a reservation-cancelled event to a specific user
   */
  sendReservationCancelled(
    userId: string,
    data: { reservationId: string; cancelledBy: string; reason?: string },
  ) {
    this.server.to(userId).emit('reservation-cancelled', data);
  }
}
