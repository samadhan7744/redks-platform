import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AddressType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

const indianPhonePattern = /^[6-9]\d{9}$/;
const pincodePattern = /^\d{6}$/;

export class CreateAddressDto {
  @ApiPropertyOptional({ enum: AddressType, default: AddressType.HOME })
  @IsOptional()
  @IsEnum(AddressType)
  type?: AddressType;

  @ApiPropertyOptional({ example: 'Home' })
  @IsOptional()
  @IsString()
  @Length(2, 40)
  label?: string;

  @ApiPropertyOptional({ example: 'Rahul Sharma' })
  @IsOptional()
  @IsString()
  @Length(2, 80)
  recipientName?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  @Matches(indianPhonePattern, {
    message: 'phone must be a valid Indian mobile number',
  })
  phone?: string;

  @ApiProperty({ example: 'Flat 204, RedKS Residency' })
  @IsOptional()
  @IsString()
  @Length(3, 180)
  addressLine1?: string;

  @ApiPropertyOptional({ example: '2nd Floor' })
  @IsOptional()
  @IsString()
  @Length(2, 180)
  addressLine2?: string;

  @ApiPropertyOptional({ example: 'Near Metro Station' })
  @IsOptional()
  @IsString()
  @Length(2, 120)
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
  @Matches(pincodePattern, { message: 'pincode must be 6 digits' })
  pincode: string;

  @ApiPropertyOptional({ example: 12.9715987 })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: 77.5945627 })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ deprecated: true, example: 'Flat 204' })
  @IsOptional()
  @IsString()
  line1?: string;

  @ApiPropertyOptional({ deprecated: true, example: '2nd Floor' })
  @IsOptional()
  @IsString()
  line2?: string;
}
