import { BadRequestException, Injectable } from '@nestjs/common';
import { RiderStatus, ShopStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateRiderStatusDto } from './dto/update-rider-status.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  pendingShops() {
    return this.prisma.shop.findMany({
      where: { status: ShopStatus.PENDING_APPROVAL },
      include: { owner: true, city: true, zone: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  pendingRiders() {
    return this.prisma.riderProfile.findMany({
      where: { status: RiderStatus.PENDING_APPROVAL },
      include: { user: true, city: true, zone: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  updateRiderStatus(adminId: string, riderId: string, dto: UpdateRiderStatusDto) {
    if (dto.status === RiderStatus.REJECTED && !dto.rejectionReason) {
      throw new BadRequestException('Rejection reason is required');
    }

    return this.prisma.riderProfile.update({
      where: { id: riderId },
      data: {
        status: dto.status,
        approvedById: dto.status === RiderStatus.APPROVED ? adminId : undefined,
        approvedAt: dto.status === RiderStatus.APPROVED ? new Date() : undefined,
        rejectionReason: dto.rejectionReason,
      },
    });
  }
}
