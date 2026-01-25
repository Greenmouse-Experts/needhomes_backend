/*
  Warnings:

  - You are about to drop the column `authorizedName` on the `VerificationDocument` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "VerificationDocument" DROP COLUMN "authorizedName",
ADD COLUMN     "authorizedId" TEXT;
