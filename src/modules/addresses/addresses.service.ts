import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { ok } from '../../common/utils/api-response.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async findForUser(userId: string) {
    return ok(
      await this.prisma.address.findMany({
        where: { userId },
        include: { city: true, zone: true },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      }),
    );
  }

  async create(userId: string, dto: CreateAddressDto) {
    if (dto.isDefault) this.assertHasCoordinates(dto);
    return ok(
      await this.prisma.$transaction(async (tx) => {
        if (dto.isDefault) {
          await tx.address.updateMany({
            where: { userId },
            data: { isDefault: false },
          });
        }
        return tx.address.create({
          data: this.toAddressData(userId, dto) as never,
          include: { city: true, zone: true },
        });
      }),
      'Address saved',
    );
  }

  async update(userId: string, id: string, dto: UpdateAddressDto) {
    const existing = await this.assertOwner(userId, id);
    if (dto.isDefault) {
      this.assertHasCoordinates({
        latitude: dto.latitude ?? this.decimalToNumber(existing.latitude),
        longitude: dto.longitude ?? this.decimalToNumber(existing.longitude),
      });
    }
    return ok(
      await this.prisma.$transaction(async (tx) => {
        if (dto.isDefault) {
          await tx.address.updateMany({
            where: { userId, id: { not: id } },
            data: { isDefault: false },
          });
        }
        return tx.address.update({
          where: { id },
          data: this.toAddressData(userId, dto, true) as never,
          include: { city: true, zone: true },
        });
      }),
      'Address updated',
    );
  }

  async remove(userId: string, id: string) {
    const address = await this.assertOwner(userId, id);
    if (address.isDefault) {
      const activeOrders = await this.prisma.order.count({
        where: {
          addressId: id,
          status: { in: this.activeOrderStatuses() },
        },
      });
      if (activeOrders > 0) {
        throw new BadRequestException(
          'Default address is used by an active order and cannot be deleted',
        );
      }
    }
    await this.prisma.address.delete({ where: { id } });
    return ok({ id }, 'Address deleted');
  }

  async setDefault(userId: string, id: string) {
    const address = await this.assertOwner(userId, id);
    this.assertHasCoordinates({
      latitude: this.decimalToNumber(address.latitude),
      longitude: this.decimalToNumber(address.longitude),
    });
    return ok(
      await this.prisma.$transaction(async (tx) => {
        await tx.address.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
        return tx.address.update({
          where: { id },
          data: { isDefault: true },
          include: { city: true, zone: true },
        });
      }),
      'Default address updated',
    );
  }

  private assertHasCoordinates(dto: { latitude?: number; longitude?: number }) {
    if (!Number.isFinite(dto.latitude) || !Number.isFinite(dto.longitude)) {
      throw new BadRequestException(
        'Default delivery address must include latitude and longitude',
      );
    }
  }

  private activeOrderStatuses() {
    return [
      OrderStatus.PLACED,
      OrderStatus.CONFIRMED,
      OrderStatus.ACCEPTED,
      OrderStatus.PACKING,
      OrderStatus.PACKED,
      OrderStatus.READY_FOR_PICKUP,
      OrderStatus.ASSIGNED,
      OrderStatus.PICKED_UP,
      OrderStatus.OUT_FOR_DELIVERY,
    ];
  }

  private decimalToNumber(value: unknown) {
    if (value === null || value === undefined) return undefined;
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : undefined;
  }

  private async assertOwner(userId: string, id: string) {
    const address = await this.prisma.address.findUnique({ where: { id } });
    if (!address) throw new NotFoundException('Address not found');
    if (address.userId !== userId) {
      throw new ForbiddenException('You can only manage your own addresses');
    }
    return address;
  }

  private toAddressData(
    userId: string,
    dto: Partial<CreateAddressDto>,
    partial = false,
  ) {
    const addressLine1 = dto.addressLine1 ?? dto.line1;
    const addressLine2 = dto.addressLine2 ?? dto.line2;
    if (!partial && !addressLine1) {
      throw new BadRequestException('addressLine1 is required');
    }
    const data = {
      userId: partial ? undefined : userId,
      type: dto.type,
      label: dto.label,
      recipientName: dto.recipientName,
      phone: dto.phone,
      line1: addressLine1,
      line2: addressLine2,
      addressLine1,
      addressLine2,
      landmark: dto.landmark,
      cityId: dto.cityId,
      zoneId: dto.zoneId,
      pincode: dto.pincode,
      latitude: dto.latitude,
      longitude: dto.longitude,
      isDefault: dto.isDefault,
    };
    Object.keys(data).forEach((key) => {
      if (data[key as keyof typeof data] === undefined) {
        delete data[key as keyof typeof data];
      }
    });
    return data;
  }
}
