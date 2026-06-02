import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductStatus, UserRole } from '@prisma/client';
import { AuthUser } from '../../common/types/auth-user.type';
import { ok, paginated, paginationParams } from '../../common/utils/api-response.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ProductQueryDto) {
    const { page, limit, skip, take } = paginationParams(query.page, query.limit);
    const where = {
      shopId: query.shopId,
      categoryId: query.categoryId,
      status: query.status ?? ProductStatus.ACTIVE,
      OR: query.search
        ? [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            { description: { contains: query.search, mode: 'insensitive' as const } },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where, skip, take, include: { shop: true, category: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.product.count({ where }),
    ]);
    return paginated(data, total, page, limit);
  }

  async findMyProducts(ownerId: string, query: ProductQueryDto) {
    const shop = await this.findOwnerShop(ownerId);
    return this.findAll({ ...query, shopId: shop.id, status: query.status });
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { shop: true, category: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return ok(product);
  }

  async create(ownerId: string, dto: CreateProductDto) {
    await this.assertProductShopOwner(dto.shopId, ownerId);
    const product = await this.prisma.product.create({
      data: {
        ...dto,
        slug: this.slugify(dto.name),
      },
    });
    return ok(product, 'Product created');
  }

  async update(user: AuthUser, id: string, dto: UpdateProductDto) {
    const product = await this.findRawById(id);
    await this.assertCanManageProduct(user, product.shopId);
    const updated = await this.prisma.product.update({
      where: { id },
      data: { ...dto, slug: dto.name ? this.slugify(dto.name) : undefined, shopId: undefined },
    });
    return ok(updated, 'Product updated');
  }

  async softDelete(user: AuthUser, id: string) {
    const product = await this.findRawById(id);
    await this.assertCanManageProduct(user, product.shopId);
    const updated = await this.prisma.product.update({ where: { id }, data: { status: ProductStatus.DELETED } });
    return ok(updated, 'Product deleted');
  }

  async updateStock(user: AuthUser, id: string, dto: UpdateStockDto) {
    const product = await this.findRawById(id);
    await this.assertCanManageProduct(user, product.shopId);
    const updated = await this.prisma.product.update({ where: { id }, data: { stock: dto.stock } });
    return ok(updated, 'Stock updated');
  }

  private async findRawById(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  private async assertCanManageProduct(user: AuthUser, shopId: string) {
    if (user.roles.includes(UserRole.ADMIN) || user.roles.includes(UserRole.SUPER_ADMIN)) return;
    await this.assertProductShopOwner(shopId, user.sub);
  }

  private async assertProductShopOwner(shopId: string, ownerId: string) {
    const shop = await this.prisma.shop.findFirst({ where: { id: shopId, ownerId }, select: { id: true } });
    if (!shop) throw new ForbiddenException('You can only manage products for your own shop');
  }

  private async findOwnerShop(ownerId: string) {
    const shop = await this.prisma.shop.findFirst({ where: { ownerId }, select: { id: true } });
    if (!shop) throw new NotFoundException('Shop not found for this owner');
    return shop;
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
