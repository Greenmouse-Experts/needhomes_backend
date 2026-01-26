/*
  Warnings:

  - The primary key for the `PartnerRole` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `partnerId` on the `PartnerRole` table. All the data in the column will be lost.
  - You are about to drop the `Partner` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[referralCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `PartnerRole` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Add partner fields to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "partnerType" "PartnerType",
ADD COLUMN IF NOT EXISTS "referralCode" TEXT,
ADD COLUMN IF NOT EXISTS "totalCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "totalReferrals" INTEGER NOT NULL DEFAULT 0;

-- Step 2: Migrate data from Partner to User table
-- Insert partners as users (only if they don't already exist)
INSERT INTO "User" (
  id, "firstName", "lastName", email, phone, password,
  "isEmailVerified", "accountType", "account_status", "account_verification_status",
  "partnerType", "referralCode", "totalReferrals", "totalCommission",
  "createdAt", "updatedAt", "deletedAt"
)
SELECT 
  p.id, p."firstName", p."lastName", p.email, p.phone, p.password,
  p."isEmailVerified", 'PARTNER'::"AccountType", p."account_status", p."account_verification_status",
  p."partnerType", p."referralCode", p."totalReferrals", p."totalCommission",
  p."createdAt", p."updatedAt", p."deletedAt"
FROM "Partner" p
WHERE NOT EXISTS (
  SELECT 1 FROM "User" u WHERE u.id = p.id
);

-- Step 3: Add temporary userId column to PartnerRole and populate it
ALTER TABLE "PartnerRole" ADD COLUMN IF NOT EXISTS "userId" TEXT;
UPDATE "PartnerRole" SET "userId" = "partnerId";

-- Step 4: Drop old foreign key constraints
ALTER TABLE "PartnerRole" DROP CONSTRAINT IF EXISTS "PartnerRole_partnerId_fkey";
ALTER TABLE "Referral" DROP CONSTRAINT IF EXISTS "Referral_partnerId_fkey";
ALTER TABLE "ReferralClick" DROP CONSTRAINT IF EXISTS "ReferralClick_partnerId_fkey";

-- Step 5: Drop old indexes
DROP INDEX IF EXISTS "PartnerRole_partnerId_idx";

-- Step 6: Update PartnerRole table structure
ALTER TABLE "PartnerRole" DROP CONSTRAINT IF EXISTS "PartnerRole_pkey";
ALTER TABLE "PartnerRole" DROP COLUMN IF EXISTS "partnerId";
ALTER TABLE "PartnerRole" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "PartnerRole" ADD CONSTRAINT "PartnerRole_pkey" PRIMARY KEY ("userId", "roleId");

-- Step 7: Create new indexes
CREATE INDEX IF NOT EXISTS "PartnerRole_userId_idx" ON "PartnerRole"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_referralCode_key" ON "User"("referralCode");
CREATE INDEX IF NOT EXISTS "User_referralCode_idx" ON "User"("referralCode");

-- Step 8: Add new foreign key constraints
ALTER TABLE "PartnerRole" ADD CONSTRAINT "PartnerRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralClick" ADD CONSTRAINT "ReferralClick_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 9: Drop Partner table (now empty or migrated)
DROP TABLE IF EXISTS "Partner";
