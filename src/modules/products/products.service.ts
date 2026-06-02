import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters: { shopId?: string; categoryId?: string }) {
    return this.prisma.product.findMany({
      where: {
        shopId: filters.shopId,
        categoryId: filters.categoryId,
        status: ProductStatus.ACTIVE,
      },
      include: { shop: true, category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { shop: true, category: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        ...dto,
        slug: this.slugify(dto.name),
      },
    });
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
