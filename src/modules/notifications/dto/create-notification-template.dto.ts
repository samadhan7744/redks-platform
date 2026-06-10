import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateNotificationTemplateDto {
  @ApiProperty({ example: 'ORDER_PLACED_IN_APP' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Order placed in-app notification' })
  @IsString()
  name: string;

  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  channel: NotificationType;

  @ApiPropertyOptional({ example: 'Your RedKS order is confirmed' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ example: 'Order {{orderNumber}} has been placed.' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ type: [String], example: ['orderNumber'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
