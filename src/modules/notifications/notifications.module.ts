import { Module } from '@nestjs/common';
import {
  AdminNotificationsController,
  NotificationsController,
} from './notifications.controller';
import {
  NOTIFICATION_PROVIDER,
  NotificationsService,
} from './notifications.service';
import { MockNotificationProvider } from './providers/mock-notification.provider';

@Module({
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [
    NotificationsService,
    MockNotificationProvider,
    {
      provide: NOTIFICATION_PROVIDER,
      useExisting: MockNotificationProvider,
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
