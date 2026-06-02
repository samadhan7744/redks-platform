import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: '9876543210' })
  @Matches(/^[6-9]\d{9}$/, { message: 'phone must be a valid 10-digit Indian mobile number' })
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(4, 8)
  otp: string;
}
