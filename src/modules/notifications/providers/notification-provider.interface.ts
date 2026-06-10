export type ProviderMessage = {
  to?: string;
  title?: string;
  message: string;
  metadata?: Record<string, unknown>;
};

export type ProviderResult = {
  provider: string;
  providerMessageId?: string;
};

export interface NotificationProvider {
  sendSMS(message: ProviderMessage): Promise<ProviderResult>;
  sendWhatsApp(message: ProviderMessage): Promise<ProviderResult>;
  sendPush(message: ProviderMessage): Promise<ProviderResult>;
  sendEmail(message: ProviderMessage): Promise<ProviderResult>;
}
