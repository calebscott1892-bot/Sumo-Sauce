-- Phase 6: harden Build.status semantics to enum-like values (PENDING|SUCCESS|FAILED)
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Build" (
  "buildId" TEXT NOT NULL PRIMARY KEY,
  "schemaVersion" TEXT NOT NULL,
  "pipelineVersion" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "manifestSha256" TEXT NOT NULL,
  "status" TEXT NOT NULL CHECK ("status" IN ('PENDING', 'SUCCESS', 'FAILED'))
);

INSERT INTO "new_Build" ("buildId", "schemaVersion", "pipelineVersion", "createdAt", "manifestSha256", "status")
SELECT
  "buildId",
  "schemaVersion",
  "pipelineVersion",
  "createdAt",
  "manifestSha256",
  CASE
    WHEN UPPER("status") = 'SUCCESS' THEN 'SUCCESS'
    WHEN UPPER("status") = 'FAILED' THEN 'FAILED'
    ELSE 'PENDING'
  END AS "status"
FROM "Build";

DROP TABLE "Build";
ALTER TABLE "new_Build" RENAME TO "Build";

CREATE INDEX "Build_status_createdAt_idx" ON "Build"("status", "createdAt");

PRAGMA foreign_keys=ON;
