import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, RiderStatus, UserRole } from '@prisma/client';
import { AuthUser } from '../../common/types/auth-user.type';
import { ok } from '../../common/utils/api-response.util';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateRiderLocationDto } from './dto/update-rider-location.dto';
import { TrackingGateway } from './tracking.gateway';

const trackableOrderStatuses: OrderStatus[] = [
  OrderStatus.ASSIGNED,
  OrderStatus.PICKED_UP,
  OrderStatus.OUT_FOR_DELIVERY,
];

@Injectable()
export class TrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: TrackingGateway,
  ) {}

  async updateRiderLocation(userId: string, dto: UpdateRiderLocationDto) {
    const rider = await this.prisma.riderProfile.findUnique({
      where: { userId },
    });
    if (!rider) throw new NotFoundException('Rider profile not found');
    if (rider.status !== RiderStatus.APPROVED) {
      throw new ForbiddenException('Only approved riders can share location');
    }

    const recordedAt = new Date();
    const location = await this.prisma.$transaction(async (tx) => {
      await tx.riderLocation.deleteMany({ where: { riderId: rider.id } });
      const latest = await tx.riderLocation.create({
        data: {
          riderId: rider.id,
          latitude: dto.latitude,
          longitude: dto.longitude,
          accuracy: dto.accuracy,
          speed: dto.speed,
          heading: dto.heading,
          recordedAt,
        },
      });
      await tx.riderProfile.update({
        where: { id: rider.id },
        data: {
          currentLatitude: dto.latitude,
          currentLongitude: dto.longitude,
        },
      });
      return latest;
    });

    await this.broadcastOrderLocation(rider.id, {
      riderId: rider.id,
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
      accuracy: location.accuracy == null ? null : Number(location.accuracy),
      speed: location.speed == null ? null : Number(location.speed),
      heading: location.heading == null ? null : Number(location.heading),
      updatedAt: location.recordedAt,
    });

    return ok(
      {
        riderId: rider.id,
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        updatedAt: location.recordedAt,
      },
      'Rider location updated',
    );
  }

  async broadcastOrderLocation(
    riderId: string,
    location: {
      riderId: string;
      latitude: number;
      longitude: number;
      accuracy?: number | null;
      speed?: number | null;
      heading?: number | null;
      updatedAt: Date;
    },
  ) {
    const activeOrders = await this.prisma.order.findMany({
      where: {
        riderId,
        status: { in: trackableOrderStatuses },
      },
      select: { id: true },
    });

    for (const order of activeOrders) {
      const payload = {
        orderId: order.id,
        ...location,
      };
      this.gateway.emitRiderLocationUpdated(order.id, payload);
      this.gateway.emitOrderTrackingUpdated(order.id, payload);
    }
  }

  async getCurrentLocation(orderId: string, user: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shop: { select: { ownerId: true } },
        rider: {
          include: {
            user: { select: { id: true } },
            locations: {
              orderBy: { recordedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!this.canAccessOrderTracking(order, user)) {
      throw new ForbiddenException('You cannot access this order tracking');
    }

    const location = order.rider?.locations[0];
    return ok({
      orderId,
      riderId: order.riderId,
      latitude: location ? Number(location.latitude) : null,
      longitude: location ? Number(location.longitude) : null,
      updatedAt: location?.recordedAt ?? null,
    });
  }

  private canAccessOrderTracking(
    order: {
      customerId: string;
      shop: { ownerId: string };
      rider?: { user: { id: string } } | null;
    },
    user: AuthUser,
  ) {
    if (order.customerId === user.sub) return true;
    if (order.shop.ownerId === user.sub) return true;
    if (order.rider?.user.id === user.sub) return true;
    const adminRoles: UserRole[] = [UserRole.ADMIN, UserRole.SUPER_ADMIN];
    return user.roles.some((role) => adminRoles.includes(role));
  }
}
