import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user.type';
import { CreateRazorpayOrderDto } from './dto/create-razorpay-order.dto';
import { VerifyRazorpayPaymentDto } from './dto/verify-razorpay-payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('razorpay/orders')
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a Razorpay order for an online RedKS order' })
  createRazorpayOrder(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateRazorpayOrderDto,
  ) {
    return this.paymentsService.createRazorpayOrder(user.sub, dto);
  }

  @Post('razorpay/verify')
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Verify Razorpay payment signature server-side' })
  verifyRazorpayPayment(
    @CurrentUser() user: AuthUser,
    @Body() dto: VerifyRazorpayPaymentDto,
  ) {
    return this.paymentsService.verifyRazorpayPayment(user.sub, dto);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get payment status for an order' })
  findByOrder(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) {
    return this.paymentsService.findForOrder(user, orderId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAll() {
    return this.paymentsService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findOne(@Param('id') id: string) {
    return this.paymentsService.findById(id);
  }
}

@ApiTags('Payments')
@Controller('payments/webhooks')
export class PaymentWebhooksController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('razorpay')
  @ApiOperation({ summary: 'Razorpay webhook receiver' })
  handleRazorpayWebhook(
    @Headers('x-razorpay-signature') signature: string | undefined,
    @Headers('x-razorpay-event-id') eventId: string | undefined,
    @Req() req: Request & { rawBody?: Buffer },
  ) {
    return this.paymentsService.handleRazorpayWebhook(
      signature,
      req.rawBody,
      req.body,
      eventId,
    );
  }
}
