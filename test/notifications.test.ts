import assert from 'node:assert/strict';
import { ForbiddenException } from '@nestjs/common';
import { NotificationStatus, NotificationType } from '@prisma/client';
import { NotificationsService } from '../src/modules/notifications/notifications.service';

function providerMock() {
  return {
    sendSMS: async () => ({ provider: 'mock-sms', providerMessageId: 'sms_1' }),
    sendWhatsApp: async () => ({ provider: 'mock-whatsapp' }),
    sendPush: async () => ({ provider: 'mock-push' }),
    sendEmail: async () => ({ provider: 'mock-email' }),
  };
}

async function testNotificationCreation() {
  const writes: unknown[] = [];
  const prisma = {
    notification: {
      create: async ({ data }: { data: unknown }) => {
        writes.push(data);
        return { id: 'notification_1', ...(data as object) };
      },
    },
  };
  const service = new NotificationsService(prisma as never, providerMock());
  const notification = await service.create({
    userId: 'user_1',
    title: 'Welcome',
    message: 'Hello RedKS',
  });

  assert.equal(notification.status, NotificationStatus.SENT);
  assert.equal(notification.type, NotificationType.IN_APP);
  assert.equal(writes.length, 1);
}

async function testTemplateRendering() {
  const service = new NotificationsService({} as never, providerMock());

  assert.equal(
    service.renderTemplate('Order {{ orderNumber }} is {{status}}', {
      orderNumber: 'RKS1',
      status: 'ready',
    }),
    'Order RKS1 is ready',
  );
}

async function testReadUnreadFlow() {
  const updates: unknown[] = [];
  const prisma = {
    notification: {
      findMany: async () => [{ id: 'notification_1', readAt: null }],
      count: async ({ where }: { where: { readAt?: null } }) =>
        where.readAt === null ? 1 : 1,
      findUnique: async () => ({
        id: 'notification_1',
        userId: 'user_1',
        readAt: null,
      }),
      update: async ({ data }: { data: unknown }) => {
        updates.push(data);
        return { id: 'notification_1', ...(data as object) };
      },
    },
  };
  const service = new NotificationsService(prisma as never, providerMock());
  const list = await service.findForUser('user_1', { page: 1, limit: 20 });
  const marked = await service.markRead('user_1', 'notification_1');

  assert.equal(list.unreadCount, 1);
  assert.ok(marked.data.readAt instanceof Date);
  assert.equal(updates.length, 1);
}

async function testAuthorizationChecks() {
  const prisma = {
    notification: {
      findUnique: async () => ({
        id: 'notification_1',
        userId: 'user_2',
        readAt: null,
      }),
    },
  };
  const service = new NotificationsService(prisma as never, providerMock());

  await assert.rejects(
    () => service.markRead('user_1', 'notification_1'),
    ForbiddenException,
  );
}

async function testOrderEventNotificationGeneration() {
  const created: Array<{ title: string; message: string; metadata: unknown }> = [];
  const prisma = {
    notification: {
      create: async ({ data }: { data: { title: string; message: string; metadata: unknown } }) => {
        created.push(data);
        return { id: `notification_${created.length}`, ...data };
      },
    },
  };
  const service = new NotificationsService(prisma as never, providerMock());
  await service.notifyOrderPlaced({
    id: 'order_1',
    orderNumber: 'RKS1',
    customerId: 'customer_1',
  });
  await service.notifyRiderAssigned({
    id: 'order_1',
    orderNumber: 'RKS1',
    customerId: 'customer_1',
    rider: { userId: 'rider_user_1' },
  });

  assert.deepEqual(
    created.map((item) => item.title),
    ['Order placed', 'Rider assigned', 'Delivery assigned'],
  );
}

async function testOutboundProviderStatus() {
  const updates: unknown[] = [];
  const prisma = {
    notification: {
      create: async ({ data }: { data: unknown }) => ({
        id: 'notification_1',
        ...(data as object),
      }),
      update: async ({ data }: { data: unknown }) => {
        updates.push(data);
        return { id: 'notification_1', ...(data as object) };
      },
    },
  };
  const service = new NotificationsService(prisma as never, providerMock());
  const notification = await service.create({
    userId: 'user_1',
    type: NotificationType.SMS,
    title: 'OTP sent',
    message: 'Your OTP was sent.',
  });

  assert.equal(notification.status, NotificationStatus.SENT);
  assert.deepEqual(updates[0], {
    status: NotificationStatus.SENT,
    provider: 'mock-sms',
    providerMessageId: 'sms_1',
    sentAt: updates[0]['sentAt'],
  });
}

void (async () => {
  await testNotificationCreation();
  await testTemplateRendering();
  await testReadUnreadFlow();
  await testAuthorizationChecks();
  await testOrderEventNotificationGeneration();
  await testOutboundProviderStatus();
  console.log('notification tests passed');
})();
