-- CreateEnum
CREATE TYPE "RiderAssignmentAttemptStatus" AS ENUM ('OFFERED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'SKIPPED');

-- AlterEnum
ALTER TYPE "RiderAvailabilityStatus" ADD VALUE 'ONLINE';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "assignmentAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastAssignmentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RiderAssignmentAttempt" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "status" "RiderAssignmentAttemptStatus" NOT NULL DEFAULT 'OFFERED',
    "reason" TEXT,
    "distanceKm" DECIMAL(10,3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiderAssignmentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RiderAssignmentAttempt_orderId_idx" ON "RiderAssignmentAttempt"("orderId");

-- CreateIndex
CREATE INDEX "RiderAssignmentAttempt_riderId_status_idx" ON "RiderAssignmentAttempt"("riderId", "status");

-- CreateIndex
CREATE INDEX "RiderAssignmentAttempt_orderId_riderId_idx" ON "RiderAssignmentAttempt"("orderId", "riderId");

-- CreateIndex
CREATE INDEX "Order_status_assignmentAttempts_idx" ON "Order"("status", "assignmentAttempts");

-- CreateIndex
CREATE INDEX "Order_assignedAt_idx" ON "Order"("assignedAt");

-- AddForeignKey
ALTER TABLE "RiderAssignmentAttempt" ADD CONSTRAINT "RiderAssignmentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderAssignmentAttempt" ADD CONSTRAINT "RiderAssignmentAttempt_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "RiderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
