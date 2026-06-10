-- Sprint-07 analytics query indexes.

CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX IF NOT EXISTS "Shop_createdAt_idx" ON "Shop"("createdAt");
CREATE INDEX IF NOT EXISTS "RiderProfile_createdAt_idx" ON "RiderProfile"("createdAt");
CREATE INDEX IF NOT EXISTS "Order_paymentStatus_placedAt_idx" ON "Order"("paymentStatus", "placedAt");
CREATE INDEX IF NOT EXISTS "Order_paymentMethod_placedAt_idx" ON "Order"("paymentMethod", "placedAt");
CREATE INDEX IF NOT EXISTS "Order_status_placedAt_idx" ON "Order"("status", "placedAt");
CREATE INDEX IF NOT EXISTS "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Payment_method_status_createdAt_idx" ON "Payment"("method", "status", "createdAt");
