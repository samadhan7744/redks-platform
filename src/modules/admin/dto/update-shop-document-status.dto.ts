import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShopDocumentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

export class UpdateShopDocumentStatusDto {
  @ApiProperty({
    enum: ShopDocumentStatus,
    example: ShopDocumentStatus.APPROVED,
  })
  @IsEnum(ShopDocumentStatus)
  status: ShopDocumentStatus;

  @ApiPropertyOptional({ example: 'Document is blurry' })
  @IsOptional()
  @IsString()
  @Length(3, 200)
  rejectionReason?: string;
}
