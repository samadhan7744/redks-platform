import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateCityDto {
  @ApiProperty({ example: 'Jaipur' })
  @IsString()
  @Length(2, 80)
  name: string;

  @ApiProperty({ example: 'Rajasthan' })
  @IsString()
  @Length(2, 80)
  state: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
