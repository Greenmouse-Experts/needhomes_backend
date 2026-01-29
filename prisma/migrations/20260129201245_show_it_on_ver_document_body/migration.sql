-- AlterTable
ALTER TABLE "VerificationDocument" ADD COLUMN     "status" "AccountVerificationDocumentStatus" NOT NULL DEFAULT 'PENDING';
