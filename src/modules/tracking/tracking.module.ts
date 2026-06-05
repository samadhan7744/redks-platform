import { Module } from '@nestjs/common';
import { TrackingEventsService } from './tracking-events.service';
import { TrackingController } from './tracking.controller';
import { TrackingGateway } from './tracking.gateway';
import { TrackingService } from './tracking.service';

@Module({
  controllers: [TrackingController],
  providers: [TrackingService, TrackingGateway, TrackingEventsService],
  exports: [TrackingService],
})
export class TrackingModule {}
