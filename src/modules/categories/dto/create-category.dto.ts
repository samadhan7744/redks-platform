import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Dairy' })
  @IsString()
  @Length(2, 100)
  name: string;

  @ApiPropertyOptional({ example: 'parent_category_cuid' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultCommissionPercent?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
