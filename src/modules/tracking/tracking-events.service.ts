import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class TrackingEventsService {
  private server?: Server;

  bindServer(server: Server) {
    this.server = server;
  }

  emitRiderLocationUpdated(orderId: string, payload: unknown) {
    this.emitToOrder(orderId, 'rider.location.updated', payload);
  }

  emitOrderTrackingUpdated(orderId: string, payload: unknown) {
    this.emitToOrder(orderId, 'order.tracking.updated', payload);
  }

  orderRoom(orderId: string) {
    return `order:${orderId}`;
  }

  private emitToOrder(orderId: string, event: string, payload: unknown) {
    this.server?.to(this.orderRoom(orderId)).emit(event, payload);
  }
}
