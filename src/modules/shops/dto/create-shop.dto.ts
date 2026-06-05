import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryMode } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

const indianPhonePattern = /^[6-9]\d{9}$/;
const pincodePattern = /^\d{6}$/;
const upiPattern = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export class CreateShopDto {
  @ApiProperty({ example: 'Ravi Kumar' })
  @IsString()
  @Length(2, 80)
  ownerName: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @Matches(indianPhonePattern, {
    message: 'ownerPhone must be a valid Indian mobile number',
  })
  ownerPhone: string;

  @ApiProperty({ example: 'Sharma Kirana Store' })
  @IsString()
  @Length(2, 120)
  shopName: string;

  @ApiProperty({ example: 'category_cuid' })
  @IsString()
  categoryId: string;

  @ApiProperty({ example: '12 MG Road' })
  @IsString()
  @Length(3, 180)
  addressLine1: string;

  @ApiPropertyOptional({ example: 'Near Metro Station' })
  @IsOptional()
  @IsString()
  @Length(2, 180)
  addressLine2?: string;

  @ApiProperty({ example: 'city_cuid' })
  @IsString()
  cityId: string;

  @ApiProperty({ example: 'zone_cuid' })
  @IsString()
  zoneId: string;

  @ApiProperty({ example: '560001' })
  @IsString()
  @Matches(pincodePattern, { message: 'pincode must be 6 digits' })
  pincode: string;

  @ApiPropertyOptional({ example: 12.971599 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 77.594566 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ example: 'https://example.com/shop.jpg' })
  @IsOptional()
  @IsString()
  shopPhotoUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com/owner.jpg' })
  @IsOptional()
  @IsString()
  ownerPhotoUrl?: string;

  @ApiProperty({ example: 'sharmakirana@upi' })
  @IsString()
  @Matches(upiPattern, { message: 'upiId must be a valid UPI ID' })
  upiId: string;

  @ApiPropertyOptional({ example: '29ABCDE1234F1Z5' })
  @IsOptional()
  @IsString()
  @Matches(gstPattern, { message: 'gstNumber format is invalid' })
  gstNumber?: string;

  @ApiPropertyOptional({ example: '12345678901234' })
  @IsOptional()
  @IsString()
  @Length(14, 14)
  fssaiNumber?: string;

  @ApiPropertyOptional({ example: 'UDYAM-KR-03-1234567' })
  @IsOptional()
  @IsString()
  udyamNumber?: string;

  @ApiPropertyOptional({ example: 'ABCDE1234F' })
  @IsOptional()
  @IsString()
  @Matches(panPattern, { message: 'panNumber format is invalid' })
  panNumber?: string;

  @ApiPropertyOptional({ enum: DeliveryMode, default: DeliveryMode.REDKS })
  @IsOptional()
  @IsEnum(DeliveryMode)
  deliveryMode?: DeliveryMode;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(50)
  deliveryRadiusKm?: number;

  @ApiPropertyOptional({ example: 199 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minOrderValue?: number;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @IsString()
  openingTime?: string;

  @ApiPropertyOptional({ example: '21:00' })
  @IsOptional()
  @IsString()
  closingTime?: string;

  @ApiPropertyOptional({ example: 'Sunday' })
  @IsOptional()
  @IsString()
  weeklyOffDay?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(50)
  commissionPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ deprecated: true, example: 'Sharma Kirana Store' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ deprecated: true, example: '9876543210' })
  @IsOptional()
  @IsString()
  phone?: string;
}
