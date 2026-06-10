-- Sprint-08 coupons, offers, promotions, and usage audit trail.

CREATE TYPE "CouponDiscountType" AS ENUM ('FLAT', 'PERCENTAGE', 'FREE_DELIVERY');

ALTER TABLE "Order" ADD COLUMN "couponId" TEXT;
CREATE INDEX "Order_couponId_idx" ON "Order"("couponId");

CREATE TABLE "Coupon" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "discountType" "CouponDiscountType" NOT NULL,
  "discountValue" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "maxDiscountAmount" DECIMAL(10, 2),
  "minimumOrderAmount" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "maximumUsage" INTEGER,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "perUserLimit" INTEGER NOT NULL DEFAULT 1,
  "firstOrderOnly" BOOLEAN NOT NULL DEFAULT false,
  "startsAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "cityId" TEXT,
  "shopId" TEXT,
  "categoryId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CouponUsage" (
  "id" TEXT NOT NULL,
  "couponId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "discountAmount" DECIMAL(10, 2) NOT NULL,
  "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CouponUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");
CREATE INDEX "Coupon_isActive_startsAt_expiresAt_idx" ON "Coupon"("isActive", "startsAt", "expiresAt");
CREATE INDEX "Coupon_cityId_idx" ON "Coupon"("cityId");
CREATE INDEX "Coupon_shopId_idx" ON "Coupon"("shopId");
CREATE INDEX "Coupon_categoryId_idx" ON "Coupon"("categoryId");
CREATE UNIQUE INDEX "CouponUsage_orderId_key" ON "CouponUsage"("orderId");
CREATE INDEX "CouponUsage_couponId_idx" ON "CouponUsage"("couponId");
CREATE INDEX "CouponUsage_userId_idx" ON "CouponUsage"("userId");
CREATE INDEX "CouponUsage_couponId_userId_idx" ON "CouponUsage"("couponId", "userId");
CREATE INDEX "CouponUsage_usedAt_idx" ON "CouponUsage"("usedAt");

ALTER TABLE "Order"
ADD CONSTRAINT "Order_couponId_fkey"
FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Coupon"
ADD CONSTRAINT "Coupon_cityId_fkey"
FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Coupon"
ADD CONSTRAINT "Coupon_shopId_fkey"
FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Coupon"
ADD CONSTRAINT "Coupon_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CouponUsage"
ADD CONSTRAINT "CouponUsage_couponId_fkey"
FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CouponUsage"
ADD CONSTRAINT "CouponUsage_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CouponUsage"
ADD CONSTRAINT "CouponUsage_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
