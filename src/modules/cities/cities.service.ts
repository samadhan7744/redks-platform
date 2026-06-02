import { Injectable, NotFoundException } from '@nestjs/common';
import { ok } from '../../common/utils/api-response.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';

@Injectable()
export class CitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return ok(await this.prisma.city.findMany({
      where: { isActive: true },
      include: { zones: { where: { isActive: true } } },
      orderBy: { name: 'asc' },
    }));
  }

  async findZones(cityId: string) {
    await this.ensureCity(cityId);
    return ok(await this.prisma.zone.findMany({
      where: { cityId, isActive: true },
      orderBy: { name: 'asc' },
    }));
  }

  async create(dto: CreateCityDto) {
    const city = await this.prisma.city.create({
      data: { ...dto, slug: this.slugify(dto.name) },
    });
    return ok(city, 'City created');
  }

  async update(id: string, dto: UpdateCityDto) {
    await this.ensureCity(id);
    const city = await this.prisma.city.update({
      where: { id },
      data: { ...dto, slug: dto.name ? this.slugify(dto.name) : undefined },
    });
    return ok(city, 'City updated');
  }

  async deactivate(id: string) {
    await this.ensureCity(id);
    const city = await this.prisma.city.update({ where: { id }, data: { isActive: false } });
    return ok(city, 'City deactivated');
  }

  private async ensureCity(id: string) {
    const city = await this.prisma.city.findUnique({ where: { id }, select: { id: true } });
    if (!city) throw new NotFoundException('City not found');
  }

  private slugify(value: string) {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
}
