import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryMode } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

export class CreateShopDto {
  @ApiProperty({ example: 'city_cuid' })
  @IsString()
  cityId: string;

  @ApiProperty({ example: 'zone_cuid' })
  @IsString()
  zoneId: string;

  @ApiProperty({ example: 'Sharma Kirana Store' })
  @IsString()
  @Length(2, 120)
  name: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  phone: string;

  @ApiProperty({ example: '12 MG Road' })
  @IsString()
  addressLine1: string;

  @ApiProperty({ example: '560001' })
  @IsString()
  pincode: string;

  @ApiPropertyOptional({ enum: DeliveryMode, default: DeliveryMode.REDKS_DELIVERY })
  @IsOptional()
  @IsEnum(DeliveryMode)
  deliveryMode?: DeliveryMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
