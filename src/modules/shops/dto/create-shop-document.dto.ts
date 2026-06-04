import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShopDocumentType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUrl, Length } from 'class-validator';

export class CreateShopDocumentDto {
  @ApiProperty({ enum: ShopDocumentType, example: ShopDocumentType.GST })
  @IsEnum(ShopDocumentType)
  type: ShopDocumentType;

  @ApiProperty({ example: 'https://example.com/documents/gst.pdf' })
  @IsString()
  @IsUrl(
    { require_tld: false },
    { message: 'fileUrl must be a valid URL placeholder' },
  )
  fileUrl: string;

  @ApiPropertyOptional({ example: 'GST certificate uploaded by shop owner' })
  @IsOptional()
  @IsString()
  @Length(2, 200)
  note?: string;
}
