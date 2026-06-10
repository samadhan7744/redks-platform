import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user.type';
import { CreateRefundDto } from './dto/create-refund.dto';
import { FinanceQueryDto } from './dto/finance-query.dto';
import { RunSettlementDto } from './dto/run-settlement.dto';
import { UpdateRefundDto } from './dto/update-refund.dto';
import { FinanceAnalyticsService } from './finance-analytics.service';
import { RefundsService } from './refunds.service';
import { SettlementsService } from './settlements.service';
import { WalletService } from './wallet.service';

@ApiTags('Wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user wallet' })
  wallet(@CurrentUser() user: AuthUser) {
    return this.walletService.getWallet(user.sub);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get current user wallet transactions' })
  transactions(@CurrentUser() user: AuthUser, @Query() query: FinanceQueryDto) {
    return this.walletService.transactions(user.sub, query);
  }
}

@ApiTags('Admin Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin')
export class AdminFinanceController {
  constructor(
    private readonly refundsService: RefundsService,
    private readonly settlementsService: SettlementsService,
    private readonly analyticsService: FinanceAnalyticsService,
  ) {}

  @Post('refunds')
  createRefund(@Body() dto: CreateRefundDto) {
    return this.refundsService.create(dto);
  }

  @Get('refunds')
  refunds(@Query() query: FinanceQueryDto) {
    return this.refundsService.findAll(query);
  }

  @Patch('refunds/:id')
  updateRefund(@Param('id') id: string, @Body() dto: UpdateRefundDto) {
    return this.refundsService.update(id, dto);
  }

  @Get('settlements')
  settlements(@Query() query: FinanceQueryDto) {
    return this.settlementsService.findAll(query);
  }

  @Post('settlements/run')
  runSettlements(@Body() dto: RunSettlementDto) {
    return this.settlementsService.run(dto);
  }

  @Get('finance/analytics')
  analytics() {
    return this.analyticsService.summary();
  }
}
