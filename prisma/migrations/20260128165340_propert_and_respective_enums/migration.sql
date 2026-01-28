-- CreateEnum
CREATE TYPE "InvestmentModel" AS ENUM ('OUTRIGHT_PURCHASE', 'CO_DEVELOPMENT', 'FRACTIONAL_OWNERSHIP', 'LAND_BANKING', 'SAVE_TO_OWN');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'LAND');

-- CreateEnum
CREATE TYPE "DevelopmentStage" AS ENUM ('PLANNING', 'ONGOING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "exitWindow" AS ENUM ('MONTHLY', 'QUATERLY', 'ANNUALLY', 'AT_MATURITY');

-- CreateEnum
CREATE TYPE "PaymentOption" AS ENUM ('FULL_PAYMENT', 'INSTALLMENT');

-- CreateEnum
CREATE TYPE "ExitRule" AS ENUM ('ANYTIME', 'AFTER_LOCK_IN_PERIOD', 'AFTER_PROJECT_COMPLETION', 'AT_EXIT_WINDOW_ONLY', 'NOT_ALLOWED');

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "propertyTitle" TEXT NOT NULL,
    "propertyType" "PropertyType" NOT NULL,
    "investmentModel" "InvestmentModel" NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "developmentStage" "DevelopmentStage" NOT NULL,
    "completionDate" TIMESTAMP(3) NOT NULL,
    "premiumProperty" BOOLEAN NOT NULL DEFAULT false,
    "coverImage" TEXT NOT NULL,
    "galleryImages" TEXT[],
    "videos" TEXT,
    "certificate" TEXT,
    "surveyPlanDocument" TEXT,
    "brochure" TEXT,
    "transferDocument" TEXT,
    "basePrice" INTEGER NOT NULL,
    "availableUnits" INTEGER NOT NULL,
    "totalPrice" INTEGER NOT NULL,
    "paymentOption" "PaymentOption",
    "installmentDuration" INTEGER,
    "minimumInvestment" INTEGER,
    "profitSharingRatio" DOUBLE PRECISION,
    "projectDuration" INTEGER,
    "exitRule" "ExitRule",
    "totalShares" INTEGER,
    "pricePerShare" INTEGER,
    "minimumShares" INTEGER,
    "exitWindow" "exitWindow",
    "plotSize" DOUBLE PRECISION,
    "pricePerPlot" INTEGER,
    "holdingPeriod" INTEGER,
    "buyBackOption" BOOLEAN,
    "targetPropertyPrice" INTEGER,
    "savingsFrequency" TEXT,
    "savingsDuration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdditionalFee" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "propertyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdditionalFee_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AdditionalFee" ADD CONSTRAINT "AdditionalFee_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
