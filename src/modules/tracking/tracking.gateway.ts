import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthUser } from '../../common/types/auth-user.type';
import { TrackingEventsService } from './tracking-events.service';
import { TrackingService } from './tracking.service';

@Injectable()
@WebSocketGateway({
  namespace: '/tracking',
  cors: { origin: true, credentials: true },
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly trackingService: TrackingService,
    private readonly events: TrackingEventsService,
  ) {}

  afterInit(server: Server) {
    this.events.bindServer(server);
  }

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
    const allowed = await this.trackingService.canAccessOrderTrackingById(
      user,
      body.orderId,
    );
    if (!allowed) {
      client.emit('order.tracking.error', { message: 'Order access denied' });
      return { ok: false };
    }
    await client.join(this.events.orderRoom(body.orderId));
    return { ok: true, room: this.events.orderRoom(body.orderId) };
  }

  private async authenticate(client: Socket): Promise<AuthUser> {
    const authToken =
      client.handshake.auth?.token ??
      client.handshake.headers.authorization?.toString().replace(/^Bearer /i, '');
    if (!authToken) throw new Error('Missing token');
    return this.jwtService.verifyAsync(authToken);
  }
}
