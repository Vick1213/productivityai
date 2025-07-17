/*
  Warnings:

  - A unique constraint covering the columns `[projectId,leadEmail]` on the table `CampaignReply` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CampaignReply_projectId_leadEmail_key" ON "CampaignReply"("projectId", "leadEmail");
