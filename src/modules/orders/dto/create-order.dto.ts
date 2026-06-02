import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class CreateOrderItemDto {
  @ApiProperty({ example: 'product_cuid' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'shop_cuid' })
  @IsString()
  shopId: string;

  @ApiProperty({ example: 'address_cuid' })
  @IsString()
  addressId: string;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.COD })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerNote?: string;
}
