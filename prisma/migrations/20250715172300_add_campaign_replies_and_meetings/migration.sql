-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('REPLIED', 'POSITIVE', 'BOOKED_MEETING', 'NEGATIVE', 'NO_RESPONSE');

-- CreateTable
CREATE TABLE "CampaignReply" (
    "id" TEXT NOT NULL,
    "leadName" TEXT NOT NULL,
    "leadEmail" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL,
    "replyContent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "CampaignReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookedMeeting" (
    "id" TEXT NOT NULL,
    "meetingDate" TIMESTAMP(3),
    "meetingTime" TEXT,
    "meetingLink" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,
    "replyId" TEXT NOT NULL,

    CONSTRAINT "BookedMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampaignReply_projectId_idx" ON "CampaignReply"("projectId");

-- CreateIndex
CREATE INDEX "CampaignReply_leadEmail_idx" ON "CampaignReply"("leadEmail");

-- CreateIndex
CREATE UNIQUE INDEX "BookedMeeting_replyId_key" ON "BookedMeeting"("replyId");

-- CreateIndex
CREATE INDEX "BookedMeeting_projectId_idx" ON "BookedMeeting"("projectId");

-- CreateIndex
CREATE INDEX "BookedMeeting_meetingDate_idx" ON "BookedMeeting"("meetingDate");

-- AddForeignKey
ALTER TABLE "CampaignReply" ADD CONSTRAINT "CampaignReply_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookedMeeting" ADD CONSTRAINT "BookedMeeting_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookedMeeting" ADD CONSTRAINT "BookedMeeting_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "CampaignReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
