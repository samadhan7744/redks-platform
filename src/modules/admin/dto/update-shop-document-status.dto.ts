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

  @ApiPropertyOptional({
    example: 'Please upload a clearer front-facing image.',
  })
  @IsOptional()
  @IsString()
  @Length(3, 500)
  reviewNotes?: string;

  @ApiPropertyOptional({
    example: 'Reupload document with all corners visible.',
  })
  @IsOptional()
  @IsString()
  @Length(3, 500)
  requestedChanges?: string;
}
