import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UserRole } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/types/auth-user.type';

@Injectable()
@WebSocketGateway({
  namespace: '/tracking',
  cors: { origin: true, credentials: true },
})
export class TrackingGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      client.data.user = await this.authenticate(client);
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('order.tracking.join')
  async joinOrderRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { orderId?: string },
  ) {
    const user = client.data.user as AuthUser | undefined;
    if (!user || !body.orderId) {
      client.emit('order.tracking.error', { message: 'Unauthorized' });
      return { ok: false };
    }
    const allowed = await this.canTrackOrder(user, body.orderId);
    if (!allowed) {
      client.emit('order.tracking.error', { message: 'Order access denied' });
      return { ok: false };
    }
    await client.join(this.orderRoom(body.orderId));
    return { ok: true, room: this.orderRoom(body.orderId) };
  }

  emitRiderLocationUpdated(orderId: string, payload: unknown) {
    this.server
      .to(this.orderRoom(orderId))
      .emit('rider.location.updated', payload);
  }

  emitOrderTrackingUpdated(orderId: string, payload: unknown) {
    this.server
      .to(this.orderRoom(orderId))
      .emit('order.tracking.updated', payload);
  }

  private orderRoom(orderId: string) {
    return `order:${orderId}`;
  }

  private async authenticate(client: Socket): Promise<AuthUser> {
    const authToken =
      client.handshake.auth?.token ??
      client.handshake.headers.authorization?.toString().replace(/^Bearer /i, '');
    if (!authToken) throw new Error('Missing token');
    return this.jwtService.verifyAsync(authToken);
  }

  private async canTrackOrder(user: AuthUser, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shop: { select: { ownerId: true } },
        rider: { select: { userId: true } },
      },
    });
    if (!order) return false;
    if (order.customerId === user.sub) return true;
    if (order.shop.ownerId === user.sub) return true;
    if (order.rider?.userId === user.sub) return true;
    const adminRoles: UserRole[] = [UserRole.ADMIN, UserRole.SUPER_ADMIN];
    if (user.roles.some((role) => adminRoles.includes(role))) {
      return true;
    }
    return false;
  }
}
