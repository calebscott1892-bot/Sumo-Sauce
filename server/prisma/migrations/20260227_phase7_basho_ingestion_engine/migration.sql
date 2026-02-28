-- Phase 7: historical basho ingestion status tracking
PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS "BashoIngestion" (
  "bashoId" TEXT NOT NULL PRIMARY KEY,
  "status" TEXT NOT NULL CHECK ("status" IN ('PENDING', 'IN_PROGRESS', 'COMPLETE', 'FAILED')),
  "startedAt" DATETIME,
  "finishedAt" DATETIME,
  "snapshotCount" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "buildId" TEXT
);

CREATE INDEX IF NOT EXISTS "BashoIngestion_status_idx" ON "BashoIngestion"("status");
CREATE INDEX IF NOT EXISTS "BashoIngestion_startedAt_idx" ON "BashoIngestion"("startedAt");

PRAGMA foreign_keys=ON;
