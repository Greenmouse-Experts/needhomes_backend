/*
  Warnings:

  - Made the column `accountType` on table `Partner` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('INDIVIDUAL', 'CORPORATE');

-- AlterTable
ALTER TABLE "Partner" ALTER COLUMN "accountType" SET NOT NULL,
ALTER COLUMN "accountType" SET DEFAULT 'PARTNER';
