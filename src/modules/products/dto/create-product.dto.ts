import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'shop_cuid' })
  @IsString()
  shopId: string;

  @ApiProperty({ example: 'category_cuid' })
  @IsString()
  categoryId: string;

  @ApiProperty({ example: 'Amul Taaza Milk 1L' })
  @IsString()
  @Length(2, 160)
  name: string;

  @ApiProperty({ example: 68 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 70 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  mrp?: number;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ example: 'litre' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
