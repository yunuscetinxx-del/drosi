-- نفّذ هذا في Supabase: SQL Editor → New query → Run
-- (بديل إذا لم يعمل prisma migrate من جهازك)

CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "lessons" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN NOT NULL DEFAULT false;

INSERT INTO "User" ("id", "email", "passwordHash", "lessons", "isAdmin", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'admin@drosi.local',
  '$2b$10$o5Y6GoHv6cZFdOcAFo9kUuQ0/.jdvvW4yIqe3XoyDFpGFA/UT2hEW',
  '[]'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("email") DO UPDATE SET
  "passwordHash" = EXCLUDED."passwordHash",
  "isAdmin" = true,
  "updatedAt" = NOW();

-- كلمة المرور: AdminPass12345
