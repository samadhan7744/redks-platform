import { ForbiddenException, Injectable } from '@nestjs/common';
import { RiderStatus } from '@prisma/client';
import { ok } from '../../common/utils/api-response.util';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateRiderAvailabilityDto } from './dto/update-rider-availability.dto';

@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  async findForRiderUser(userId: string) {
    const rider = await this.prisma.riderProfile.findUnique({ where: { userId } });
    return ok(await this.prisma.delivery.findMany({
      where: { riderId: rider?.id ?? 'none' },
      include: { order: true },
      orderBy: { createdAt: 'desc' },
    }));
  }

  async findAll() {
    return ok(await this.prisma.delivery.findMany({
      include: { order: true, rider: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    }));
  }

  async updateAvailability(userId: string, dto: UpdateRiderAvailabilityDto) {
    const rider = await this.prisma.riderProfile.findUnique({ where: { userId } });
    if (!rider || rider.status !== RiderStatus.APPROVED) {
      throw new ForbiddenException('Approved rider profile required');
    }
    return ok(
      await this.prisma.riderProfile.update({
        where: { id: rider.id },
        data: {
          availabilityStatus: dto.availabilityStatus,
          currentLatitude: dto.currentLatitude,
          currentLongitude: dto.currentLongitude,
          lastAvailableAt: dto.availabilityStatus === 'AVAILABLE' ? new Date() : undefined,
        },
      }),
      'Rider availability updated',
    );
  }
}
