-- Phase 5 domain schema (additive; preserves existing EntityRecord tables)
PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS "Build" (
  "buildId" TEXT NOT NULL PRIMARY KEY,
  "schemaVersion" TEXT NOT NULL,
  "pipelineVersion" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "manifestSha256" TEXT NOT NULL,
  "status" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS "Build_status_createdAt_idx" ON "Build"("status", "createdAt");

CREATE TABLE IF NOT EXISTS "BuildSnapshot" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "buildId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "sha256" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "bytes" INTEGER NOT NULL,
  FOREIGN KEY ("buildId") REFERENCES "Build"("buildId") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "BuildSnapshot_buildId_source_sha256_url_key"
  ON "BuildSnapshot"("buildId", "source", "sha256", "url");
CREATE INDEX IF NOT EXISTS "BuildSnapshot_buildId_idx" ON "BuildSnapshot"("buildId");
CREATE INDEX IF NOT EXISTS "BuildSnapshot_source_sha256_idx" ON "BuildSnapshot"("source", "sha256");

CREATE TABLE IF NOT EXISTS "Rikishi" (
  "rikishiId" TEXT NOT NULL PRIMARY KEY,
  "shikona" TEXT NOT NULL,
  "heya" TEXT,
  "birthDate" TEXT,
  "heightCm" INTEGER,
  "weightKg" INTEGER,
  "nationality" TEXT,
  "officialImageUrl" TEXT,
  "imageUrl" TEXT,
  "updatedBuildId" TEXT NOT NULL,
  FOREIGN KEY ("updatedBuildId") REFERENCES "Build"("buildId") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Rikishi_updatedBuildId_idx" ON "Rikishi"("updatedBuildId");

CREATE TABLE IF NOT EXISTS "Basho" (
  "bashoId" TEXT NOT NULL PRIMARY KEY,
  "label" TEXT,
  "updatedBuildId" TEXT NOT NULL,
  FOREIGN KEY ("updatedBuildId") REFERENCES "Build"("buildId") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Basho_updatedBuildId_idx" ON "Basho"("updatedBuildId");

CREATE TABLE IF NOT EXISTS "BanzukeEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "bashoId" TEXT NOT NULL,
  "division" TEXT NOT NULL,
  "rankValue" INTEGER NOT NULL,
  "side" TEXT NOT NULL,
  "rikishiId" TEXT NOT NULL,
  "rankLabel" TEXT,
  "updatedBuildId" TEXT NOT NULL,
  FOREIGN KEY ("bashoId") REFERENCES "Basho"("bashoId") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("rikishiId") REFERENCES "Rikishi"("rikishiId") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("updatedBuildId") REFERENCES "Build"("buildId") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "BanzukeEntry_bashoId_division_rankValue_side_key"
  ON "BanzukeEntry"("bashoId", "division", "rankValue", "side");
CREATE INDEX IF NOT EXISTS "BanzukeEntry_bashoId_division_idx" ON "BanzukeEntry"("bashoId", "division");
CREATE INDEX IF NOT EXISTS "BanzukeEntry_rikishiId_idx" ON "BanzukeEntry"("rikishiId");
CREATE INDEX IF NOT EXISTS "BanzukeEntry_updatedBuildId_idx" ON "BanzukeEntry"("updatedBuildId");

CREATE TABLE IF NOT EXISTS "Kimarite" (
  "kimariteId" TEXT NOT NULL PRIMARY KEY,
  "label" TEXT,
  "updatedBuildId" TEXT NOT NULL,
  FOREIGN KEY ("updatedBuildId") REFERENCES "Build"("buildId") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Kimarite_updatedBuildId_idx" ON "Kimarite"("updatedBuildId");

CREATE TABLE IF NOT EXISTS "Bout" (
  "boutId" TEXT NOT NULL PRIMARY KEY,
  "bashoId" TEXT NOT NULL,
  "division" TEXT NOT NULL,
  "day" INTEGER NOT NULL,
  "boutNo" INTEGER NOT NULL,
  "eastRikishiId" TEXT NOT NULL,
  "westRikishiId" TEXT NOT NULL,
  "winnerRikishiId" TEXT,
  "kimariteId" TEXT,
  "updatedBuildId" TEXT NOT NULL,
  FOREIGN KEY ("bashoId") REFERENCES "Basho"("bashoId") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("eastRikishiId") REFERENCES "Rikishi"("rikishiId") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("westRikishiId") REFERENCES "Rikishi"("rikishiId") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("kimariteId") REFERENCES "Kimarite"("kimariteId") ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY ("updatedBuildId") REFERENCES "Build"("buildId") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Bout_bashoId_division_day_idx" ON "Bout"("bashoId", "division", "day");
CREATE INDEX IF NOT EXISTS "Bout_eastRikishiId_idx" ON "Bout"("eastRikishiId");
CREATE INDEX IF NOT EXISTS "Bout_westRikishiId_idx" ON "Bout"("westRikishiId");
CREATE INDEX IF NOT EXISTS "Bout_updatedBuildId_idx" ON "Bout"("updatedBuildId");

CREATE TABLE IF NOT EXISTS "SourceRef" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "snapshotSha256" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "refType" TEXT,
  "note" TEXT,
  "buildId" TEXT NOT NULL,
  FOREIGN KEY ("buildId") REFERENCES "Build"("buildId") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "source_ref_unique"
  ON "SourceRef"("entityType", "entityId", "source", "snapshotSha256", "buildId", "refType");
CREATE INDEX IF NOT EXISTS "SourceRef_buildId_idx" ON "SourceRef"("buildId");
CREATE INDEX IF NOT EXISTS "SourceRef_entityType_entityId_idx" ON "SourceRef"("entityType", "entityId");

CREATE TABLE IF NOT EXISTS "Tombstone" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "buildId" TEXT NOT NULL,
  "removedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("buildId") REFERENCES "Build"("buildId") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Tombstone_entityType_entityId_buildId_key"
  ON "Tombstone"("entityType", "entityId", "buildId");
CREATE INDEX IF NOT EXISTS "Tombstone_entityType_entityId_idx" ON "Tombstone"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "Tombstone_buildId_idx" ON "Tombstone"("buildId");

PRAGMA foreign_keys=ON;
