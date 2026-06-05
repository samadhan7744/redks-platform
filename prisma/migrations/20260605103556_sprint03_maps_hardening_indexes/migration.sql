-- CreateIndex
CREATE INDEX "Address_cityId_idx" ON "Address"("cityId");

-- CreateIndex
CREATE INDEX "Address_zoneId_idx" ON "Address"("zoneId");

-- CreateIndex
CREATE INDEX "Shop_zoneId_idx" ON "Shop"("zoneId");

-- CreateIndex
CREATE INDEX "Shop_latitude_longitude_idx" ON "Shop"("latitude", "longitude");
