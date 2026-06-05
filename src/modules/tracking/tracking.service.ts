import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, RiderStatus, UserRole } from '@prisma/client';
import { AuthUser } from '../../common/types/auth-user.type';
import { ok } from '../../common/utils/api-response.util';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { UpdateRiderLocationDto } from './dto/update-rider-location.dto';
import { TrackingEventsService } from './tracking-events.service';

const trackableOrderStatuses: OrderStatus[] = [
  OrderStatus.ASSIGNED,
  OrderStatus.PICKED_UP,
  // Existing RedKS rider pickup flow currently moves orders to OUT_FOR_DELIVERY.
  OrderStatus.OUT_FOR_DELIVERY,
];
const minuteLocationLimit = 6;
const hourLocationLimit = 60;

@Injectable()
export class TrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: TrackingEventsService,
    private readonly redis: RedisService,
  ) {}

  async updateRiderLocation(userId: string, dto: UpdateRiderLocationDto) {
    const rider = await this.prisma.riderProfile.findUnique({
      where: { userId },
    });
    if (!rider) throw new NotFoundException('Rider profile not found');
    if (rider.status !== RiderStatus.APPROVED) {
      throw new ForbiddenException('Only approved riders can share location');
    }

    await this.enforceLocationRateLimit(rider.id);
    const activeOrders = await this.activeTrackingOrders(rider.id);
    if (!activeOrders.length) {
      throw new ForbiddenException(
        'Location tracking is only allowed for active assigned orders',
      );
    }

    const recordedAt = new Date();
    const location = await this.prisma.$transaction(async (tx) => {
      const latest = await tx.riderLocation.upsert({
        where: { riderId: rider.id },
        update: {
          latitude: dto.latitude,
          longitude: dto.longitude,
          accuracy: dto.accuracy,
          speed: dto.speed,
          heading: dto.heading,
          recordedAt,
        },
        create: {
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
    const activeOrders = await this.activeTrackingOrders(riderId);

    for (const order of activeOrders) {
      const payload = {
        orderId: order.id,
        ...location,
      };
      this.events.emitRiderLocationUpdated(order.id, payload);
      this.events.emitOrderTrackingUpdated(order.id, payload);
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

  async canAccessOrderTrackingById(user: AuthUser, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shop: { select: { ownerId: true } },
        rider: { include: { user: { select: { id: true } } } },
      },
    });
    if (!order) return false;
    return this.canAccessOrderTracking(order, user);
  }

  async cleanupRetainedLocations(retainDays = 7) {
    const cutoff = new Date(Date.now() - retainDays * 24 * 60 * 60 * 1000);
    return this.prisma.riderLocation.deleteMany({
      where: { recordedAt: { lt: cutoff } },
    });
  }

  private activeTrackingOrders(riderId: string) {
    return this.prisma.order.findMany({
      where: {
        riderId,
        status: { in: trackableOrderStatuses },
      },
      select: { id: true },
    });
  }

  private async enforceLocationRateLimit(riderId: string) {
    const minuteCount = await this.redis.incrementWithTtl(
      `tracking:location:${riderId}:minute`,
      60,
    );
    if (minuteCount > minuteLocationLimit) {
      throw new HttpException(
        'Rider location rate limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const hourCount = await this.redis.incrementWithTtl(
      `tracking:location:${riderId}:hour`,
      60 * 60,
    );
    if (hourCount > hourLocationLimit) {
      throw new HttpException(
        'Rider location rate limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
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
