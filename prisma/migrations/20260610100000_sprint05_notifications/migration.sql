-- Sprint-05 notifications and communication engine.

CREATE TYPE "NotificationType" AS ENUM ('SMS', 'WHATSAPP', 'PUSH', 'EMAIL', 'IN_APP');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

ALTER TABLE "Notification"
ADD COLUMN "type" "NotificationType" NOT NULL DEFAULT 'IN_APP',
ADD COLUMN "message" TEXT,
ADD COLUMN "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "provider" TEXT,
ADD COLUMN "providerMessageId" TEXT,
ADD COLUMN "metadata" JSONB,
ADD COLUMN "sentAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Notification"
SET
  "message" = COALESCE("body", ''),
  "type" = CASE
    WHEN "channel" IN ('SMS', 'WHATSAPP', 'PUSH', 'EMAIL', 'IN_APP')
      THEN "channel"::"NotificationType"
    ELSE 'IN_APP'::"NotificationType"
  END,
  "status" = 'SENT',
  "sentAt" = "createdAt"
WHERE "message" IS NULL;

ALTER TABLE "Notification"
ALTER COLUMN "message" SET NOT NULL;

ALTER TABLE "Notification" DROP COLUMN IF EXISTS "body";
ALTER TABLE "Notification" DROP COLUMN IF EXISTS "channel";

CREATE INDEX "Notification_type_status_idx" ON "Notification"("type", "status");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

CREATE TABLE "NotificationTemplate" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "channel" "NotificationType" NOT NULL,
  "subject" TEXT,
  "content" TEXT NOT NULL,
  "variables" TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationTemplate_code_key" ON "NotificationTemplate"("code");
CREATE INDEX "NotificationTemplate_channel_isActive_idx" ON "NotificationTemplate"("channel", "isActive");
