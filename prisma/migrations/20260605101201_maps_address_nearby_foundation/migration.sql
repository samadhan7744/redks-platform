-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "addressLine1" TEXT,
ADD COLUMN     "addressLine2" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "recipientName" TEXT;

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "serviceRadiusKm" DECIMAL(6,2);
