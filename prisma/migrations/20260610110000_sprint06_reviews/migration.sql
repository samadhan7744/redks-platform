-- Sprint-06 reviews, replies, moderation, and rating aggregates.

CREATE TYPE "ReviewType" AS ENUM ('SHOP', 'RIDER', 'PRODUCT', 'ORDER');
CREATE TYPE "ReviewStatus" AS ENUM ('PUBLISHED', 'HIDDEN', 'FLAGGED');

ALTER TABLE "Shop"
ADD COLUMN "averageRating" DECIMAL(3, 2) NOT NULL DEFAULT 0,
ADD COLUMN "ratingCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Product"
ADD COLUMN "averageRating" DECIMAL(3, 2) NOT NULL DEFAULT 0,
ADD COLUMN "ratingCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "RiderProfile"
ADD COLUMN "averageRating" DECIMAL(3, 2) NOT NULL DEFAULT 0,
ADD COLUMN "ratingCount" INTEGER NOT NULL DEFAULT 0;

DROP INDEX IF EXISTS "Review_orderId_key";
DROP INDEX IF EXISTS "Review_userId_idx";
ALTER TABLE "Review" RENAME COLUMN "userId" TO "customerId";
ALTER TABLE "Review"
ADD COLUMN "riderId" TEXT,
ADD COLUMN "productId" TEXT,
ADD COLUMN "reviewKey" TEXT,
ADD COLUMN "reviewType" "ReviewType" NOT NULL DEFAULT 'SHOP',
ADD COLUMN "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED';

UPDATE "Review"
SET "reviewKey" = "orderId" || ':' || "customerId" || ':' || "reviewType"::text || ':none'
WHERE "reviewKey" IS NULL;

ALTER TABLE "Review" ALTER COLUMN "reviewKey" SET NOT NULL;

ALTER TABLE "Review"
ADD CONSTRAINT "Review_riderId_fkey"
FOREIGN KEY ("riderId") REFERENCES "RiderProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Review"
ADD CONSTRAINT "Review_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Review_reviewKey_key" ON "Review"("reviewKey");
CREATE INDEX "Review_shopId_status_idx" ON "Review"("shopId", "status");
CREATE INDEX "Review_productId_status_idx" ON "Review"("productId", "status");
CREATE INDEX "Review_riderId_status_idx" ON "Review"("riderId", "status");
CREATE INDEX "Review_customerId_idx" ON "Review"("customerId");
CREATE INDEX "Review_reviewType_status_idx" ON "Review"("reviewType", "status");

CREATE TABLE "ReviewReply" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ReviewReply_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReviewReply_reviewId_idx" ON "ReviewReply"("reviewId");
CREATE INDEX "ReviewReply_userId_idx" ON "ReviewReply"("userId");

ALTER TABLE "ReviewReply"
ADD CONSTRAINT "ReviewReply_reviewId_fkey"
FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReviewReply"
ADD CONSTRAINT "ReviewReply_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
