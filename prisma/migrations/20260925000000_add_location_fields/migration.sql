-- AlterTable
ALTER TABLE "Salon" ADD COLUMN IF NOT EXISTS "province" TEXT,
ADD COLUMN IF NOT EXISTS "district" TEXT,
ADD COLUMN IF NOT EXISTS "area" TEXT,
ADD COLUMN IF NOT EXISTS "postalCode" TEXT;

-- AlterTable
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "province" TEXT,
ADD COLUMN IF NOT EXISTS "district" TEXT,
ADD COLUMN IF NOT EXISTS "area" TEXT,
ADD COLUMN IF NOT EXISTS "postalCode" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Branch_district_idx" ON "Branch"("district");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Branch_city_idx" ON "Branch"("city");
