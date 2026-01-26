-- CreateTable
CREATE TABLE "Bank" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "code" TEXT NOT NULL,
    "longcode" TEXT,
    "gateway" TEXT,
    "pay_with_bank" BOOLEAN NOT NULL DEFAULT false,
    "supports_transfer" BOOLEAN NOT NULL DEFAULT false,
    "available_for_direct_debit" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "type" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bank_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bank_code_key" ON "Bank"("code");

-- CreateIndex
CREATE INDEX "Bank_code_idx" ON "Bank"("code");

-- CreateIndex
CREATE INDEX "Bank_name_idx" ON "Bank"("name");
