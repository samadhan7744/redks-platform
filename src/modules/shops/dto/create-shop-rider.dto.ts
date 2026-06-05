import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

const indianPhonePattern = /^[6-9]\d{9}$/;
const upiPattern = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

export class CreateShopRiderDto {
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

  @ApiPropertyOptional({ example: 'Bike' })
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @ApiPropertyOptional({ example: 'KA01AB1234' })
  @IsOptional()
  @IsString()
  vehicleNumber?: string;

  @ApiPropertyOptional({ example: 'amit@upi' })
  @IsOptional()
  @IsString()
  @Matches(upiPattern, { message: 'upiId must be a valid UPI ID' })
  upiId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccount?: string;

  @ApiPropertyOptional()
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
  profilePhotoUrl?: string;
}
