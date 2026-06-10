import { Module } from '@nestjs/common';
import { AssignmentModule } from '../assignment/assignment.module';
import { CouponsModule } from '../coupons/coupons.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminOrdersController } from './admin-orders.controller';
import { OrderCalculationService } from './order-calculation.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { RiderOrdersController } from './rider-orders.controller';
import { ShopOrdersController } from './shop-orders.controller';

@Module({
  imports: [AssignmentModule, CouponsModule, NotificationsModule],
  controllers: [
    OrdersController,
    ShopOrdersController,
    RiderOrdersController,
    AdminOrdersController,
  ],
  providers: [OrdersService, OrderCalculationService],
  exports: [OrdersService],
})
export class OrdersModule {}
