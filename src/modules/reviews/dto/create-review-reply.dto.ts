import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateReviewReplyDto {
  @ApiProperty({ example: 'Thank you for your feedback.' })
  @IsString()
  @MinLength(2)
  message: string;
}
