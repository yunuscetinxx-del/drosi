-- CreateTable
CREATE TABLE "AppPublicConfig" (
    "singleton" TEXT NOT NULL DEFAULT 'global',
    "apiBaseUrl" TEXT NOT NULL,
    "forceApiBaseUrl" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppPublicConfig_pkey" PRIMARY KEY ("singleton")
);
