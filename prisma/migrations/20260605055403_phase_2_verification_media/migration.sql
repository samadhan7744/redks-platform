-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ShopDocumentType" AS ENUM ('GST', 'FSSAI', 'UDYAM', 'PAN', 'AADHAAR', 'SHOP_PHOTO', 'OWNER_PHOTO', 'OTHER');

-- CreateEnum
CREATE TYPE "ShopDocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED');

-- CreateEnum
CREATE TYPE "VerificationDocumentOwnerType" AS ENUM ('SHOP', 'RIDER', 'SHOP_RIDER', 'PRODUCT');

-- CreateEnum
CREATE TYPE "VerificationDocumentType" AS ENUM ('GST', 'FSSAI', 'UDYAM', 'PAN', 'AADHAAR', 'DRIVING_LICENSE', 'VEHICLE_RC', 'INSURANCE', 'SELFIE', 'PROFILE_PHOTO', 'SHOP_PHOTO', 'OWNER_PHOTO', 'PRODUCT_PHOTO', 'OTHER');

-- CreateEnum
CREATE TYPE "VerificationDocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED');

-- CreateEnum
CREATE TYPE "ShopRiderStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED', 'CHANGES_REQUESTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DeliveryMode" ADD VALUE 'REDKS';
ALTER TYPE "DeliveryMode" ADD VALUE 'SELF';
ALTER TYPE "DeliveryMode" ADD VALUE 'HYBRID';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RiderStatus" ADD VALUE 'DRAFT';
ALTER TYPE "RiderStatus" ADD VALUE 'SUBMITTED';
ALTER TYPE "RiderStatus" ADD VALUE 'UNDER_REVIEW';
ALTER TYPE "RiderStatus" ADD VALUE 'CHANGES_REQUESTED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ShopStatus" ADD VALUE 'SUBMITTED';
ALTER TYPE "ShopStatus" ADD VALUE 'CHANGES_REQUESTED';

-- AlterTable
ALTER TABLE "RiderProfile" ADD COLUMN     "aadhaarUrl" TEXT,
ADD COLUMN     "bankAccount" TEXT,
ADD COLUMN     "changesRequestedAt" TIMESTAMP(3),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "emergencyName" TEXT,
ADD COLUMN     "emergencyPhone" TEXT,
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "insuranceUrl" TEXT,
ADD COLUMN     "panUrl" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "profilePhotoUrl" TEXT,
ADD COLUMN     "reviewNotes" TEXT,
ADD COLUMN     "selfieUrl" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "upiId" TEXT,
ADD COLUMN     "vehicleRcUrl" TEXT;

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "changesRequestedAt" TIMESTAMP(3),
ADD COLUMN     "closingTime" TEXT,
ADD COLUMN     "commissionPercent" DECIMAL(5,2) NOT NULL DEFAULT 10,
ADD COLUMN     "deliveryRadiusKm" DECIMAL(6,2),
ADD COLUMN     "fssaiNumber" TEXT,
ADD COLUMN     "gstNumber" TEXT,
ADD COLUMN     "minOrderValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "openingTime" TEXT,
ADD COLUMN     "ownerName" TEXT,
ADD COLUMN     "ownerPhone" TEXT,
ADD COLUMN     "ownerPhotoUrl" TEXT,
ADD COLUMN     "panNumber" TEXT,
ADD COLUMN     "reviewNotes" TEXT,
ADD COLUMN     "shopName" TEXT,
ADD COLUMN     "shopPhotoUrl" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "udyamNumber" TEXT,
ADD COLUMN     "upiId" TEXT,
ADD COLUMN     "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "weeklyOffDay" TEXT;

-- CreateTable
CREATE TABLE "ShopDocument" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "type" "ShopDocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "status" "ShopDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewNotes" TEXT,
    "requestedChanges" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationDocument" (
    "id" TEXT NOT NULL,
    "ownerType" "VerificationDocumentOwnerType" NOT NULL,
    "shopId" TEXT,
    "riderProfileId" TEXT,
    "shopRiderId" TEXT,
    "productId" TEXT,
    "type" "VerificationDocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "status" "VerificationDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewNotes" TEXT,
    "requestedChanges" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopRider" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "userId" TEXT,
    "riderProfileId" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "status" "ShopRiderStatus" NOT NULL DEFAULT 'DRAFT',
    "vehicleType" TEXT,
    "vehicleNumber" TEXT,
    "aadhaarUrl" TEXT,
    "panUrl" TEXT,
    "drivingLicenseUrl" TEXT,
    "vehicleRcUrl" TEXT,
    "insuranceUrl" TEXT,
    "selfieUrl" TEXT,
    "profilePhotoUrl" TEXT,
    "upiId" TEXT,
    "bankAccount" TEXT,
    "emergencyName" TEXT,
    "emergencyPhone" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "reviewNotes" TEXT,
    "changesRequestedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopRider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopDocument_shopId_idx" ON "ShopDocument"("shopId");

-- CreateIndex
CREATE INDEX "ShopDocument_type_status_idx" ON "ShopDocument"("type", "status");

-- CreateIndex
CREATE INDEX "VerificationDocument_ownerType_type_status_idx" ON "VerificationDocument"("ownerType", "type", "status");

-- CreateIndex
CREATE INDEX "VerificationDocument_shopId_status_idx" ON "VerificationDocument"("shopId", "status");

-- CreateIndex
CREATE INDEX "VerificationDocument_riderProfileId_status_idx" ON "VerificationDocument"("riderProfileId", "status");

-- CreateIndex
CREATE INDEX "VerificationDocument_shopRiderId_status_idx" ON "VerificationDocument"("shopRiderId", "status");

-- CreateIndex
CREATE INDEX "VerificationDocument_productId_idx" ON "VerificationDocument"("productId");

-- CreateIndex
CREATE INDEX "ShopRider_shopId_status_idx" ON "ShopRider"("shopId", "status");

-- CreateIndex
CREATE INDEX "ShopRider_phone_idx" ON "ShopRider"("phone");

-- CreateIndex
CREATE INDEX "ShopRider_riderProfileId_idx" ON "ShopRider"("riderProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopRider_shopId_phone_key" ON "ShopRider"("shopId", "phone");

-- CreateIndex
CREATE INDEX "RiderProfile_phone_idx" ON "RiderProfile"("phone");

-- CreateIndex
CREATE INDEX "Shop_categoryId_status_idx" ON "Shop"("categoryId", "status");

-- CreateIndex
CREATE INDEX "Shop_verificationStatus_idx" ON "Shop"("verificationStatus");

-- CreateIndex
CREATE INDEX "User_roles_idx" ON "User" USING GIN ("roles");

-- AddForeignKey
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopDocument" ADD CONSTRAINT "ShopDocument_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationDocument" ADD CONSTRAINT "VerificationDocument_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationDocument" ADD CONSTRAINT "VerificationDocument_riderProfileId_fkey" FOREIGN KEY ("riderProfileId") REFERENCES "RiderProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationDocument" ADD CONSTRAINT "VerificationDocument_shopRiderId_fkey" FOREIGN KEY ("shopRiderId") REFERENCES "ShopRider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationDocument" ADD CONSTRAINT "VerificationDocument_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationDocument" ADD CONSTRAINT "VerificationDocument_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopRider" ADD CONSTRAINT "ShopRider_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopRider" ADD CONSTRAINT "ShopRider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopRider" ADD CONSTRAINT "ShopRider_riderProfileId_fkey" FOREIGN KEY ("riderProfileId") REFERENCES "RiderProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
