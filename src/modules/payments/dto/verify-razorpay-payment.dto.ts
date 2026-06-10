import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class VerifyRazorpayPaymentDto {
  @ApiProperty({ example: 'order_cuid' })
  @IsString()
  orderId: string;

  @ApiProperty({ example: 'order_RazorpayOrderId' })
  @IsString()
  razorpayOrderId: string;

  @ApiProperty({ example: 'pay_RazorpayPaymentId' })
  @IsString()
  razorpayPaymentId: string;

  @ApiProperty({ example: 'generated_signature' })
  @IsString()
  razorpaySignature: string;
}
