import { Injectable } from '@nestjs/common';
import {
  NotificationProvider,
  ProviderMessage,
  ProviderResult,
} from './notification-provider.interface';

@Injectable()
export class MockNotificationProvider implements NotificationProvider {
  async sendSMS(message: ProviderMessage) {
    return this.mock('mock-sms', message);
  }

  async sendWhatsApp(message: ProviderMessage) {
    return this.mock('mock-whatsapp', message);
  }

  async sendPush(message: ProviderMessage) {
    return this.mock('mock-push', message);
  }

  async sendEmail(message: ProviderMessage) {
    return this.mock('mock-email', message);
  }

  private async mock(provider: string, message: ProviderMessage): Promise<ProviderResult> {
    return {
      provider,
      providerMessageId: `${provider}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
  }
}
