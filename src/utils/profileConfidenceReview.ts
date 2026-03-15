import {
  formatVerifiedBasho,
  getAllVerifiedProfiles,
  type ImageConfidence,
  type ProfileConfidence,
  type ProvenanceStatus,
  type VerifiedProfile,
} from '@/data/verifiedProfiles';

export type ReviewSeverity = 'high' | 'medium' | 'low';

export type ProfileReviewRow = {
  index: number;
  shikona: string;
  rikishiId: string | null;
  heya: string | null;
  division: string | null;
  batchRef: string | null;
  lastVerifiedBasho: string | null;
  lastVerifiedBashoLabel: string;
  status: string;
  profileConfidence: ProfileConfidence;
  imageConfidence: ImageConfidence;
  provenanceStatus: ProvenanceStatus;
  sourceRefCount: number;
  nonHttpsSourceCount: number;
  missingFields: string[];
  metadataGapCount: number;
  profilePath: string | null;
};

export type ReviewQueueItem = ProfileReviewRow & {
  reason: string;
  nextStep: string;
};

export type ReviewQueue = {
  key: string;
  title: string;
  description: string;
  actionLabel: string;
  severity: ReviewSeverity;
  count: number;
  items: ReviewQueueItem[];
};

export type ReviewSpotlight = {
  key: string;
  title: string;
  count: number;
  severity: ReviewSeverity;
  detail: string;
  nextStep: string;
};

export type ProfileConfidenceReviewReport = {
  totals: {
    totalProfiles: number;
    verifiedProfiles: number;
    likelyProfiles: number;
    unverifiedProfiles: number;
    confirmedProvenance: number;
    inferredProvenance: number;
    unresolvedProvenance: number;
    quarantinedProvenance: number;
    verifiedImages: number;
    missingImages: number;
    withheldImages: number;
    emptySourceRefs: number;
    thinSourceRefs: number;
    batchRefGaps: number;
    lastVerifiedGaps: number;
    metadataHotspots: number;
  };
  queues: ReviewQueue[];
  spotlight: ReviewSpotlight[];
};

const CORE_METADATA_FIELDS: Array<[keyof VerifiedProfile, string]> = [
  ['rikishiId', 'rikishiId'],
  ['heya', 'heya'],
  ['birthDate', 'birthDate'],
  ['nationality', 'nationality'],
  ['heightCm', 'heightCm'],
  ['weightKg', 'weightKg'],
  ['division', 'division'],
  ['batchRef', 'batchRef'],
  ['lastVerifiedBasho', 'lastVerifiedBasho'],
];

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

function severityForCount(count: number): ReviewSeverity {
  if (count >= 25) return 'high';
  if (count >= 5) return 'medium';
  return 'low';
}

function buildReviewRows(rows: readonly VerifiedProfile[]): ProfileReviewRow[] {
  return rows.map((profile, index) => {
    const sourceRefs = Array.isArray(profile.sourceRefs) ? profile.sourceRefs : [];
    const nonHttpsSourceCount = sourceRefs.filter((ref) => {
      const url = typeof ref?.url === 'string' ? ref.url.trim() : '';
      return Boolean(url) && !url.startsWith('https://');
    }).length;
    const missingFields = CORE_METADATA_FIELDS
      .filter(([field]) => !hasValue(profile[field]))
      .map(([, label]) => label);
    const rikishiId = typeof profile.rikishiId === 'string' && profile.rikishiId.trim()
      ? profile.rikishiId.trim()
      : null;

    return {
      index,
      shikona: profile.shikona,
      rikishiId,
      heya: profile.heya,
      division: profile.division,
      batchRef: profile.batchRef,
      lastVerifiedBasho: profile.lastVerifiedBasho,
      lastVerifiedBashoLabel: formatVerifiedBasho(profile.lastVerifiedBasho),
      status: profile.status,
      profileConfidence: profile.profileConfidence,
      imageConfidence: profile.imageConfidence,
      provenanceStatus: profile.provenanceStatus,
      sourceRefCount: sourceRefs.length,
      nonHttpsSourceCount,
      missingFields,
      metadataGapCount: missingFields.length,
      profilePath: rikishiId ? `/rikishi/${encodeURIComponent(rikishiId)}` : null,
    };
  });
}

function sortQueueItems(items: ReviewQueueItem[]): ReviewQueueItem[] {
  return [...items].sort((a, b) => {
    const gapDelta = b.metadataGapCount - a.metadataGapCount;
    if (gapDelta !== 0) return gapDelta;

    const sourceDelta = a.sourceRefCount - b.sourceRefCount;
    if (sourceDelta !== 0) return sourceDelta;

    return a.shikona.localeCompare(b.shikona);
  });
}

function buildQueue(
  key: string,
  title: string,
  description: string,
  actionLabel: string,
  rows: ReviewQueueItem[],
): ReviewQueue {
  const items = sortQueueItems(rows);
  return {
    key,
    title,
    description,
    actionLabel,
    severity: severityForCount(items.length),
    count: items.length,
    items,
  };
}

function withReason(
  rows: ProfileReviewRow[],
  nextStep: string,
  reasonBuilder: (row: ProfileReviewRow) => string,
): ReviewQueueItem[] {
  return rows.map((row) => ({
    ...row,
    reason: reasonBuilder(row),
    nextStep,
  }));
}

export function buildProfileConfidenceReview(
  profiles: readonly VerifiedProfile[] = getAllVerifiedProfiles(),
): ProfileConfidenceReviewReport {
  const rows = buildReviewRows(profiles);

  const unverifiedProfiles = withReason(
    rows.filter((row) => row.profileConfidence === 'unverified'),
    'Verify core identity and provenance fields before treating the profile as trusted.',
    (row) => `Profile confidence is unverified with ${row.sourceRefCount} published source ref${row.sourceRefCount === 1 ? '' : 's'}.`,
  );

  const inferredProvenance = withReason(
    rows.filter((row) => row.provenanceStatus === 'inferred'),
    'Confirm division and batch lineage so this profile can move out of inferred status.',
    (row) => `Provenance is inferred${row.batchRef ? '' : ' and batchRef is still missing'}.`,
  );

  const provenanceHotspots = withReason(
    rows.filter((row) => (!row.batchRef || !row.division || !row.lastVerifiedBasho) && row.provenanceStatus !== 'quarantined'),
    'Backfill the missing provenance field before the next dataset expansion touches this profile.',
    (row) => `Missing provenance fields: ${row.missingFields.filter((field) => field === 'division' || field === 'batchRef' || field === 'lastVerifiedBasho').join(', ') || 'none recorded'}.`,
  );

  const missingImages = withReason(
    rows.filter((row) => row.imageConfidence === 'missing' || row.imageConfidence === 'unverified'),
    'Check whether a publishable official image exists and keep it withheld until verification is complete.',
    (row) => row.imageConfidence === 'missing'
      ? 'No verified official image is currently published.'
      : 'An image trail exists, but it is still below the publishable confidence threshold.',
  );

  const weakSourceCoverage = withReason(
    rows.filter((row) => row.sourceRefCount <= 1 || row.nonHttpsSourceCount > 0),
    'Add corroborating references or normalize the published URLs so the trust layer is easier to defend.',
    (row) => {
      if (row.sourceRefCount === 0) return 'No source refs are published.';
      if (row.nonHttpsSourceCount > 0) return `${row.nonHttpsSourceCount} published source URL${row.nonHttpsSourceCount === 1 ? '' : 's'} are not HTTPS.`;
      return 'Only one source ref is published.';
    },
  );

  const metadataHotspots = withReason(
    rows.filter((row) => row.metadataGapCount >= 3),
    'Use this as a cleanup queue for profiles with multiple missing core fields at once.',
    (row) => `Missing ${row.metadataGapCount} core metadata fields: ${row.missingFields.join(', ')}.`,
  );

  const queues = [
    buildQueue(
      'unverified-profiles',
      'Unverified profiles',
      'Profiles still below the trusted identity threshold.',
      'Review trust state',
      unverifiedProfiles,
    ),
    buildQueue(
      'inferred-provenance',
      'Inferred provenance',
      'Profiles whose lineage still depends on inference rather than final confirmation.',
      'Tighten provenance',
      inferredProvenance,
    ),
    buildQueue(
      'provenance-hotspots',
      'Batch / provenance gaps',
      'Profiles missing batchRef, division, or lastVerifiedBasho context.',
      'Backfill provenance fields',
      provenanceHotspots,
    ),
    buildQueue(
      'missing-images',
      'Missing or withheld images',
      'Profiles that still need image verification work or verified-image coverage.',
      'Review image coverage',
      missingImages,
    ),
    buildQueue(
      'weak-source-coverage',
      'Missing or thin source coverage',
      'Profiles with zero or one published source ref, or non-HTTPS source URLs.',
      'Strengthen source refs',
      weakSourceCoverage,
    ),
    buildQueue(
      'metadata-hotspots',
      'Null metadata hotspots',
      'Profiles missing multiple core metadata fields at once.',
      'Prioritize cleanup',
      metadataHotspots,
    ),
  ];

  const totals = {
    totalProfiles: rows.length,
    verifiedProfiles: rows.filter((row) => row.profileConfidence === 'verified').length,
    likelyProfiles: rows.filter((row) => row.profileConfidence === 'likely').length,
    unverifiedProfiles: unverifiedProfiles.length,
    confirmedProvenance: rows.filter((row) => row.provenanceStatus === 'confirmed').length,
    inferredProvenance: inferredProvenance.length,
    unresolvedProvenance: rows.filter((row) => row.provenanceStatus === 'unresolved').length,
    quarantinedProvenance: rows.filter((row) => row.provenanceStatus === 'quarantined').length,
    verifiedImages: rows.filter((row) => row.imageConfidence === 'verified').length,
    missingImages: rows.filter((row) => row.imageConfidence === 'missing').length,
    withheldImages: rows.filter((row) => row.imageConfidence === 'likely' || row.imageConfidence === 'unverified').length,
    emptySourceRefs: rows.filter((row) => row.sourceRefCount === 0).length,
    thinSourceRefs: rows.filter((row) => row.sourceRefCount <= 1).length,
    batchRefGaps: rows.filter((row) => !row.batchRef && row.provenanceStatus !== 'quarantined').length,
    lastVerifiedGaps: rows.filter((row) => !row.lastVerifiedBasho).length,
    metadataHotspots: metadataHotspots.length,
  };

  const spotlight = [
    {
      key: 'provenance',
      title: 'Profiles with provenance gaps',
      count: provenanceHotspots.length,
      severity: severityForCount(provenanceHotspots.length),
      detail: 'These profiles are the clearest blockers for future batch expansion because lineage is still incomplete.',
      nextStep: 'Start with batchRef and lastVerifiedBasho backfills before wider enrichment work.',
    },
    {
      key: 'images',
      title: 'Profiles without publishable images',
      count: missingImages.length,
      severity: severityForCount(missingImages.length),
      detail: 'Image work remains a large coverage gap, but verified-image safety rules stay intact.',
      nextStep: 'Treat this as a separate verification queue from core identity research.',
    },
    {
      key: 'sources',
      title: 'Profiles with weak source coverage',
      count: weakSourceCoverage.length,
      severity: severityForCount(weakSourceCoverage.length),
      detail: 'These are the easiest review candidates when the goal is to raise confidence without changing semantics.',
      nextStep: 'Add corroborating refs or clean URLs before claiming stronger trust.',
    },
  ];

  return {
    totals,
    queues,
    spotlight,
  };
}

let memoizedReport: ProfileConfidenceReviewReport | null = null;

export function getProfileConfidenceReview(): ProfileConfidenceReviewReport {
  if (!memoizedReport) {
    memoizedReport = buildProfileConfidenceReview();
  }
  return memoizedReport;
}
