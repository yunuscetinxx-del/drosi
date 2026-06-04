-- CreateTable
CREATE TABLE "LessonShare" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "permission" TEXT NOT NULL DEFAULT 'read',
    "allowCopy" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LessonShare_token_key" ON "LessonShare"("token");

-- CreateIndex
CREATE INDEX "LessonShare_ownerId_lessonId_idx" ON "LessonShare"("ownerId", "lessonId");

-- CreateIndex
CREATE INDEX "LessonShare_token_idx" ON "LessonShare"("token");

-- AddForeignKey
ALTER TABLE "LessonShare" ADD CONSTRAINT "LessonShare_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
