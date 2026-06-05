-- AlterTable
ALTER TABLE "User" ADD COLUMN "geminiApiKeyEnc" TEXT,
ADD COLUMN "geminiKeyHint" TEXT,
ADD COLUMN "geminiKeyUpdatedAt" TIMESTAMP(3);
