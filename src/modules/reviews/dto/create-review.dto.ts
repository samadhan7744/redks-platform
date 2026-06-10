import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReviewType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 'order_cuid' })
  @IsString()
  orderId: string;

  @ApiProperty({ enum: ReviewType, example: ReviewType.SHOP })
  @IsEnum(ReviewType)
  reviewType: ReviewType;

  @ApiPropertyOptional({ example: 'product_cuid' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}
