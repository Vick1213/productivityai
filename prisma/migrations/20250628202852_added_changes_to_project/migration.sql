-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dueAt" TIMESTAMP(3);
