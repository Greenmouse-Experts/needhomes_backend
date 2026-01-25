/*
  Warnings:

  - You are about to drop the column `document` on the `VerificationDocument` table. All the data in the column will be lost.
  - Added the required column `verificationType` to the `VerificationDocument` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "VerificationType" ADD VALUE 'PARTNER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "profilePicture" TEXT;

-- AlterTable
ALTER TABLE "VerificationDocument" DROP COLUMN "document",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "authorizedName" TEXT,
ADD COLUMN     "cacDocument" TEXT,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "rcNumber" TEXT,
ADD COLUMN     "utilityBill" TEXT,
ADD COLUMN     "verificationType" "VerificationType" NOT NULL,
ALTER COLUMN "idType" DROP NOT NULL,
ALTER COLUMN "frontPage" DROP NOT NULL;
