import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AddressType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateAddressDto {
  @ApiPropertyOptional({ enum: AddressType, default: AddressType.HOME })
  @IsOptional()
  @IsEnum(AddressType)
  type?: AddressType;

  @ApiProperty({ example: 'Flat 204, RedKS Residency' })
  @IsString()
  line1: string;

  @ApiPropertyOptional({ example: 'Near Metro Station' })
  @IsOptional()
  @IsString()
  landmark?: string;

  @ApiProperty({ example: 'city_cuid' })
  @IsString()
  cityId: string;

  @ApiPropertyOptional({ example: 'zone_cuid' })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiProperty({ example: '560001' })
  @IsString()
  pincode: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
