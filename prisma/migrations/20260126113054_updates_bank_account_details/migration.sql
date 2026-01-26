/*
  Warnings:

  - You are about to drop the column `accountNumber` on the `BankAccount` table. All the data in the column will be lost.
  - Added the required column `account_name` to the `BankAccount` table without a default value. This is not possible if the table is not empty.
  - Added the required column `account_number` to the `BankAccount` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BankAccount" DROP COLUMN "accountNumber",
ADD COLUMN     "account_name" TEXT NOT NULL,
ADD COLUMN     "account_number" TEXT NOT NULL,
ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'NG',
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'NGN';
