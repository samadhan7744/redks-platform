import { Module } from '@nestjs/common';
import { ItemRequestsController } from './item-requests.controller';
import { ItemRequestsService } from './item-requests.service';

@Module({
  controllers: [ItemRequestsController],
  providers: [ItemRequestsService],
})
export class ItemRequestsModule {}
