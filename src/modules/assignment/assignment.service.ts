import { Injectable } from '@nestjs/common';
import {
  DeliveryStatus,
  OrderStatus,
  RiderAssignmentAttemptStatus,
  RiderAvailabilityStatus,
  RiderStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const maxAssignmentAttempts = 5;
const maxActiveOrdersPerRider = 3;
const activeOrderStatuses: OrderStatus[] = [
  OrderStatus.ASSIGNED,
  OrderStatus.PICKED_UP,
  OrderStatus.OUT_FOR_DELIVERY,
];
const missingDistanceKm = Number.MAX_SAFE_INTEGER;

type Candidate = {
  id: string;
  createdAt: Date;
  currentLatitude: unknown;
  currentLongitude: unknown;
  activeOrdersCount: number;
  distanceKm: number;
};

@Injectable()
export class AssignmentService {
  constructor(private readonly prisma: PrismaService) {}

  async assignBestRider(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shop: true,
        assignmentHistory: true,
      },
    });
    if (!order) return null;
    if (order.status !== OrderStatus.READY_FOR_PICKUP) return null;
    if (order.assignmentAttempts >= maxAssignmentAttempts) return null;

    const attemptedRiderIds = order.assignmentHistory.map(
      (attempt) => attempt.riderId,
    );
    const riders = await this.prisma.riderProfile.findMany({
      where: {
        cityId: order.shop.cityId,
        zoneId: order.shop.zoneId,
        status: RiderStatus.APPROVED,
        availabilityStatus: {
          in: [
            RiderAvailabilityStatus.ONLINE,
            RiderAvailabilityStatus.AVAILABLE,
          ],
        },
        id: attemptedRiderIds.length ? { notIn: attemptedRiderIds } : undefined,
      },
      select: {
        id: true,
        createdAt: true,
        currentLatitude: true,
        currentLongitude: true,
      },
    });

    if (!riders.length) return null;

    const activeCounts = await this.activeOrderCounts(
      riders.map((rider) => rider.id),
    );
    const candidates = riders
      .map((rider) => ({
        ...rider,
        activeOrdersCount: activeCounts.get(rider.id) ?? 0,
        distanceKm: this.distanceKm(
          order.shop.latitude,
          order.shop.longitude,
          rider.currentLatitude,
          rider.currentLongitude,
        ),
      }))
      .filter((rider) => rider.activeOrdersCount < maxActiveOrdersPerRider)
      .sort(this.compareCandidates);

    const best = candidates[0];
    if (!best) return null;

    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const assigned = await tx.order.updateMany({
        where: {
          id: orderId,
          riderId: null,
          status: OrderStatus.READY_FOR_PICKUP,
          assignmentAttempts: { lt: maxAssignmentAttempts },
        },
        data: {
          riderId: best.id,
          status: OrderStatus.ASSIGNED,
          assignedAt: now,
          lastAssignmentAt: now,
          assignmentAttempts: { increment: 1 },
        },
      });
      if (assigned.count !== 1) return null;

      await tx.riderAssignmentAttempt.create({
        data: {
          orderId,
          riderId: best.id,
          status: RiderAssignmentAttemptStatus.OFFERED,
          distanceKm: best.distanceKm !== missingDistanceKm
            ? best.distanceKm
            : undefined,
        },
      });
      await tx.riderProfile.update({
        where: { id: best.id },
        data: {
          availabilityStatus:
            best.activeOrdersCount + 1 >= maxActiveOrdersPerRider
              ? RiderAvailabilityStatus.BUSY
              : RiderAvailabilityStatus.ONLINE,
        },
      });
      await tx.delivery.upsert({
        where: { orderId },
        update: {
          riderId: best.id,
          status: DeliveryStatus.ASSIGNED,
          assignedAt: now,
        },
        create: {
          orderId,
          riderId: best.id,
          status: DeliveryStatus.ASSIGNED,
          assignedAt: now,
        },
      });
      return tx.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          shop: true,
          rider: { include: { user: true } },
          address: true,
          items: true,
          delivery: true,
          payment: true,
        },
      });
    });
  }

  async reassignAfterRejection(orderId: string) {
    return this.assignBestRider(orderId);
  }

  async markLatestAttemptAccepted(orderId: string, riderId: string) {
    const attempt = await this.latestAttempt(orderId, riderId);
    if (!attempt) return;
    await this.prisma.riderAssignmentAttempt.update({
      where: { id: attempt.id },
      data: { status: RiderAssignmentAttemptStatus.ACCEPTED },
    });
  }

  async markLatestAttemptRejected(
    orderId: string,
    riderId: string,
    reason?: string,
  ) {
    const attempt = await this.latestAttempt(orderId, riderId);
    if (!attempt) return;
    await this.prisma.riderAssignmentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: RiderAssignmentAttemptStatus.REJECTED,
        reason,
      },
    });
  }

  async hasOtherActiveOrders(riderId: string, excludingOrderId?: string) {
    return (await this.activeOrderCount(riderId, excludingOrderId)) > 0;
  }

  async activeOrderCount(riderId: string, excludingOrderId?: string) {
    const count = await this.prisma.order.count({
      where: {
        riderId,
        id: excludingOrderId ? { not: excludingOrderId } : undefined,
        status: { in: activeOrderStatuses },
      },
    });
    return count;
  }

  private async latestAttempt(orderId: string, riderId: string) {
    return this.prisma.riderAssignmentAttempt.findFirst({
      where: { orderId, riderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async activeOrderCounts(riderIds: string[]) {
    const rows = await this.prisma.order.groupBy({
      by: ['riderId'],
      where: {
        riderId: { in: riderIds },
        status: { in: activeOrderStatuses },
      },
      _count: { _all: true },
    });
    return new Map(
      rows
        .filter((row) => row.riderId)
        .map((row) => [row.riderId as string, row._count._all]),
    );
  }

  private compareCandidates(a: Candidate, b: Candidate) {
    if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
    if (a.activeOrdersCount !== b.activeOrdersCount) {
      return a.activeOrdersCount - b.activeOrdersCount;
    }
    return a.createdAt.getTime() - b.createdAt.getTime();
  }

  private distanceKm(
    lat1Value: unknown,
    lon1Value: unknown,
    lat2Value: unknown,
    lon2Value: unknown,
  ) {
    const lat1 = Number(lat1Value);
    const lon1 = Number(lon1Value);
    const lat2 = Number(lat2Value);
    const lon2 = Number(lon2Value);
    if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) {
      return missingDistanceKm;
    }
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
