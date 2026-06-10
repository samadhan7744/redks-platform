import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateRazorpayOrderDto {
  @ApiProperty({ example: 'order_cuid' })
  @IsString()
  orderId: string;
}
