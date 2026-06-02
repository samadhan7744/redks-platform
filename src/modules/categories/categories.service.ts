import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ok } from '../../common/utils/api-response.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return ok(await this.prisma.category.findMany({
      where: { isActive: true },
      include: { parent: true, children: { where: { isActive: true } } },
      orderBy: { name: 'asc' },
    }));
  }

  async findById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { parent: true, children: true },
    });
    if (!category) throw new NotFoundException('Category not found');
    return ok(category);
  }

  async create(dto: CreateCategoryDto) {
    if (dto.parentId) await this.ensureCategory(dto.parentId);
    const category = await this.prisma.category.create({
      data: { ...dto, slug: this.slugify(dto.name) },
    });
    return ok(category, 'Category created');
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.ensureCategory(id);
    if (dto.parentId === id) throw new BadRequestException('Category cannot be its own parent');
    if (dto.parentId) await this.ensureCategory(dto.parentId);
    const category = await this.prisma.category.update({
      where: { id },
      data: { ...dto, slug: dto.name ? this.slugify(dto.name) : undefined },
    });
    return ok(category, 'Category updated');
  }

  async deactivate(id: string) {
    await this.ensureCategory(id);
    const category = await this.prisma.category.update({ where: { id }, data: { isActive: false } });
    return ok(category, 'Category deactivated');
  }

  private async ensureCategory(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id }, select: { id: true } });
    if (!category) throw new NotFoundException('Category not found');
  }

  private slugify(value: string) {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
}
