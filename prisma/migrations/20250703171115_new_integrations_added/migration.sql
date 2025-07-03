/*
  Warnings:

  - A unique constraint covering the columns `[smartleadCampaignId]` on the table `Project` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('SMARTLEADS');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "integrationAccountId" TEXT,
ADD COLUMN     "smartleadCampaignId" TEXT;

-- CreateTable
CREATE TABLE "IntegrationAccount" (
    "id" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "externalId" TEXT NOT NULL,
    "apiKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "IntegrationAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntegrationAccount_provider_externalId_idx" ON "IntegrationAccount"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationAccount_provider_externalId_key" ON "IntegrationAccount"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_smartleadCampaignId_key" ON "Project"("smartleadCampaignId");

-- AddForeignKey
ALTER TABLE "IntegrationAccount" ADD CONSTRAINT "IntegrationAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_integrationAccountId_fkey" FOREIGN KEY ("integrationAccountId") REFERENCES "IntegrationAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
