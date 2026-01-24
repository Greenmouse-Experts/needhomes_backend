/*
  Warnings:

  - The `accountType` column on the `Partner` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `partnerType` to the `Partner` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Partner" ADD COLUMN     "partnerType" "PartnerType" NOT NULL,
DROP COLUMN "accountType",
ADD COLUMN     "accountType" "AccountType";
