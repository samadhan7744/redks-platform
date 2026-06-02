import { Module } from '@nestjs/common';
import { ItemRequestsController } from './item-requests.controller';
import { ItemRequestsService } from './item-requests.service';
import { ShopItemRequestsController } from './shop-item-requests.controller';

@Module({
  controllers: [ItemRequestsController, ShopItemRequestsController],
  providers: [ItemRequestsService],
})
export class ItemRequestsModule {}
