import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

const indianPhonePattern = /^[6-9]\d{9}$/;
const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const upiPattern = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

export class CreateRiderProfileDto {
  @ApiProperty({ example: 'Amit Sharma' })
  @IsString()
  @Length(2, 100)
  fullName: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @Matches(indianPhonePattern, {
    message: 'phone must be a valid Indian mobile number',
  })
  phone: string;

  @ApiPropertyOptional({ example: 'amit@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'city_cuid' })
  @IsString()
  cityId: string;

  @ApiPropertyOptional({ example: 'zone_cuid' })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiPropertyOptional({ example: 'Bike' })
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @ApiPropertyOptional({ example: 'KA01AB1234' })
  @IsOptional()
  @IsString()
  vehicleNumber?: string;

  @ApiPropertyOptional({ example: 'ABCDE1234F' })
  @IsOptional()
  @IsString()
  @Matches(panPattern, { message: 'PAN format is invalid' })
  panNumber?: string;

  @ApiPropertyOptional({ example: 'amit@upi' })
  @IsOptional()
  @IsString()
  @Matches(upiPattern, { message: 'upiId must be a valid UPI ID' })
  upiId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccount?: string;

  @ApiPropertyOptional({ example: 'Ramesh Sharma' })
  @IsOptional()
  @IsString()
  emergencyName?: string;

  @ApiPropertyOptional({ example: '9876543211' })
  @IsOptional()
  @IsString()
  @Matches(indianPhonePattern, {
    message: 'emergencyPhone must be a valid Indian mobile number',
  })
  emergencyPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  aadhaarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  panUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  drivingLicenseUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleRcUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  insuranceUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  selfieUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;

  @ApiPropertyOptional({ example: 12.971599 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  currentLatitude?: number;

  @ApiPropertyOptional({ example: 77.594566 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  currentLongitude?: number;
}
