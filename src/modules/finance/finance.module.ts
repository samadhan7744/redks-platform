import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminFinanceController, WalletController } from './finance.controller';
import { FinanceAnalyticsService } from './finance-analytics.service';
import { RefundsService } from './refunds.service';
import { SettlementsService } from './settlements.service';
import { WalletService } from './wallet.service';

@Module({
  imports: [NotificationsModule],
  controllers: [WalletController, AdminFinanceController],
  providers: [
    WalletService,
    RefundsService,
    SettlementsService,
    FinanceAnalyticsService,
  ],
  exports: [WalletService, RefundsService, SettlementsService],
})
export class FinanceModule {}
