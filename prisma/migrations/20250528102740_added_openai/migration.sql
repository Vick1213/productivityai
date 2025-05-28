-- AlterTable
ALTER TABLE "User" ADD COLUMN     "openAIKey" TEXT,
ADD COLUMN     "openAIModel" TEXT DEFAULT 'gpt-3.5-turbo';
