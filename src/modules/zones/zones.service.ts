import { Injectable, NotFoundException } from '@nestjs/common';
import { ok } from '../../common/utils/api-response.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';

@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(cityId?: string) {
    return ok(await this.prisma.zone.findMany({
      where: { cityId, isActive: true },
      include: { city: true },
      orderBy: { name: 'asc' },
    }));
  }

  async create(dto: CreateZoneDto) {
    const zone = await this.prisma.zone.create({
      data: { ...dto, slug: this.slugify(dto.name) },
    });
    return ok(zone, 'Zone created');
  }

  async update(id: string, dto: UpdateZoneDto) {
    await this.ensureZone(id);
    const zone = await this.prisma.zone.update({
      where: { id },
      data: { ...dto, slug: dto.name ? this.slugify(dto.name) : undefined },
    });
    return ok(zone, 'Zone updated');
  }

  async deactivate(id: string) {
    await this.ensureZone(id);
    const zone = await this.prisma.zone.update({ where: { id }, data: { isActive: false } });
    return ok(zone, 'Zone deactivated');
  }

  private async ensureZone(id: string) {
    const zone = await this.prisma.zone.findUnique({ where: { id }, select: { id: true } });
    if (!zone) throw new NotFoundException('Zone not found');
  }

  private slugify(value: string) {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
}
