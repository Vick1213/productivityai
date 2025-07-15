-- AlterTable
ALTER TABLE "Invite" ADD COLUMN     "isClient" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isClient" BOOLEAN NOT NULL DEFAULT false;
