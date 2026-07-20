-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "lessons" TEXT NOT NULL,
    "calendarEvents" TEXT NOT NULL DEFAULT '[]',
    "aiLearningProfile" TEXT NOT NULL DEFAULT '{}',
    "geminiApiKeyEnc" TEXT,
    "geminiKeyHint" TEXT,
    "geminiKeyUpdatedAt" DATETIME,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LessonShare" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "permission" TEXT NOT NULL DEFAULT 'read',
    "allowCopy" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "scope" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LessonShare_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppPublicConfig" (
    "singleton" TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
    "apiBaseUrl" TEXT NOT NULL,
    "forceApiBaseUrl" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "LessonShare_token_key" ON "LessonShare"("token");

-- CreateIndex
CREATE INDEX "LessonShare_ownerId_lessonId_idx" ON "LessonShare"("ownerId", "lessonId");

-- CreateIndex
CREATE INDEX "LessonShare_token_idx" ON "LessonShare"("token");
