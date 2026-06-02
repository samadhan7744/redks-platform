import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateQuoteDto {
  @ApiProperty({ example: 499 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: 'Can deliver by 7 PM.' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ example: '2026-06-03T12:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
