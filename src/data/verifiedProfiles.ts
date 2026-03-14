/**
 * Verified Rikishi Profile Adapter
 * ==================================
 * Loads the JSA-verified rikishi profile dataset and provides
 * deterministic lookups by shikona (short or full) and JSA rikishi ID.
 *
 * Covers all six divisions: Makuuchi, Jūryō, Makushita, Sandanme, Jonidan, and Jonokuchi,
 * plus historical legends (Yokozuna/Ōzeki 2000–present).
 *
 * Image policy:
 *   - Only returns an image URL when `imageConfidence === "verified"`
 *   - Returns '' for "likely", "missing", or unverified confidence,
 *     triggering the FallbackAvatar placeholder in all downstream components.
 *
 * This module is statically imported at build time — the JSON is
 * tree-shaken into the bundle by Vite. No runtime fetch required.
 *
 * Expected source file: data/makuuchi_verified_profiles.json
 * Format documented in: data/VERIFIED_PROFILES_FORMAT.md
 */

import rawProfiles from '../../data/makuuchi_verified_profiles.json';
import { bashoDisplayName } from '@/utils/basho';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ImageConfidence = 'verified' | 'likely' | 'unverified' | 'missing';
export type ProfileConfidence = 'verified' | 'likely' | 'unverified';
export type ProvenanceStatus = 'confirmed' | 'inferred' | 'unresolved' | 'quarantined';

export interface VerifiedSourceRef {
  label: string;
  url: string;
}

export interface VerifiedProfile {
  rikishiId: string | null;
  shikona: string;
  heya: string | null;
  birthDate: string | null;
  nationality: string | null;
  heightCm: number | null;
  weightKg: number | null;
  status: string;
  officialImageUrl: string | null;
  imageSource: string | null;
  imageConfidence: ImageConfidence;
  profileConfidence: ProfileConfidence;
  sourceRefs: VerifiedSourceRef[];
  notes: string;

  // Provenance metadata (added March 2026)
  division: string | null;
  batchRef: string | null;
  lastVerifiedBasho: string | null;
  provenanceStatus: ProvenanceStatus;
}

export interface VerifiedDatasetMetrics {
  totalProfiles: number;
  activeProfiles: number;
  verifiedProfileCount: number;
  verifiedImageCount: number;
  confirmedProvenanceCount: number;
  profilesWithSourceRefsCount: number;
  divisionsCovered: string[];
  latestVerifiedBasho: string | null;
  latestVerifiedBashoLabel: string | null;
}

export interface TrustPresentation {
  label: string;
  detail: string;
  variant: 'red' | 'gold' | 'green' | 'blue' | 'zinc' | 'amber';
}

const PROFILE_PRESENTATION: Record<ProfileConfidence, TrustPresentation> = {
  verified: {
    label: 'Profile verified',
    detail: 'Core profile fields are verified in the structured trust layer.',
    variant: 'green',
  },
  likely: {
    label: 'Profile partially verified',
    detail: 'Core profile fields are present, but some attributes still rely on secondary corroboration.',
    variant: 'amber',
  },
  unverified: {
    label: 'Profile unverified',
    detail: 'Core profile data exists, but this record still needs stronger verification before it should be treated as fully trusted.',
    variant: 'red',
  },
};

const IMAGE_PRESENTATION: Record<ImageConfidence, TrustPresentation> = {
  verified: {
    label: 'Official image verified',
    detail: 'An official image is shown because image verification is complete.',
    variant: 'blue',
  },
  likely: {
    label: 'Image withheld',
    detail: 'A possible image exists, but it is intentionally withheld until image verification is complete.',
    variant: 'amber',
  },
  unverified: {
    label: 'Image withheld',
    detail: 'Image provenance is too weak to publish safely, so the official image remains hidden.',
    variant: 'red',
  },
  missing: {
    label: 'No verified image',
    detail: 'No verified official image is currently published for this profile.',
    variant: 'zinc',
  },
};

const PROVENANCE_PRESENTATION: Record<ProvenanceStatus, TrustPresentation> = {
  confirmed: {
    label: 'Provenance confirmed',
    detail: 'Division and verification context are confirmed for this canonical record.',
    variant: 'green',
  },
  inferred: {
    label: 'Provenance inferred',
    detail: 'The profile is usable, but roster or division context still depends on inference rather than direct final confirmation.',
    variant: 'amber',
  },
  unresolved: {
    label: 'Provenance unresolved',
    detail: 'Context is still open and should be treated as provisional.',
    variant: 'red',
  },
  quarantined: {
    label: 'Provenance quarantined',
    detail: 'This record is intentionally isolated until verification issues are resolved.',
    variant: 'red',
  },
};

// ---------------------------------------------------------------------------
// Build lookup indexes (runs once at module load)
// ---------------------------------------------------------------------------

const profiles: VerifiedProfile[] = rawProfiles as VerifiedProfile[];

function buildVerifiedDatasetMetrics(rows: readonly VerifiedProfile[]): VerifiedDatasetMetrics {
  let latestVerifiedBasho: string | null = null;

  for (const profile of rows) {
    if (!profile.lastVerifiedBasho) continue;
    if (!latestVerifiedBasho || profile.lastVerifiedBasho > latestVerifiedBasho) {
      latestVerifiedBasho = profile.lastVerifiedBasho;
    }
  }

  return {
    totalProfiles: rows.length,
    activeProfiles: rows.filter((profile) => profile.status === 'active').length,
    verifiedProfileCount: rows.filter((profile) => profile.profileConfidence === 'verified').length,
    verifiedImageCount: rows.filter((profile) => profile.imageConfidence === 'verified').length,
    confirmedProvenanceCount: rows.filter((profile) => profile.provenanceStatus === 'confirmed').length,
    profilesWithSourceRefsCount: rows.filter((profile) => Array.isArray(profile.sourceRefs) && profile.sourceRefs.length > 0).length,
    divisionsCovered: Array.from(new Set(rows.map((profile) => profile.division).filter(Boolean) as string[])).sort(),
    latestVerifiedBasho,
    latestVerifiedBashoLabel: latestVerifiedBasho ? bashoDisplayName(latestVerifiedBasho) : null,
  };
}

const datasetMetrics = buildVerifiedDatasetMetrics(profiles);

/** Lookup by normalised shikona (short form preferred, full form also indexed) */
const byShikona = new Map<string, VerifiedProfile>();

/** Lookup by JSA rikishiId (string, e.g. "3842") */
const byJsaId = new Map<string, VerifiedProfile>();

function normalizeShikona(value: string): string {
  return (value || '').trim().toLowerCase();
}

for (const profile of profiles) {
  // Index by JSA rikishi ID (skip null — some Jūryō profiles lack IDs)
  if (profile.rikishiId) {
    byJsaId.set(profile.rikishiId, profile);
  }

  // Index by full shikona ("Hoshoryu Tomokatsu" → "hoshoryu tomokatsu")
  const fullKey = normalizeShikona(profile.shikona);
  if (fullKey) {
    byShikona.set(fullKey, profile);
  }

  // Index by short shikona — first token only ("Hoshoryu")
  // Only set if not already taken (avoids collisions between different
  // rikishi who happen to share a first-token shikona, though this is
  // extremely rare in Makuuchi).
  const shortKey = fullKey.split(/\s+/)[0];
  if (shortKey && !byShikona.has(shortKey)) {
    byShikona.set(shortKey, profile);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Look up a verified profile by shikona.
 * Accepts both short ("Hoshoryu") and full ("Hoshoryu Tomokatsu") forms.
 */
export function getVerifiedProfile(shikona: string): VerifiedProfile | null {
  const key = normalizeShikona(shikona);
  if (!key) return null;
  return byShikona.get(key) ?? null;
}

/**
 * Look up a verified profile by JSA numeric rikishi ID.
 */
export function getVerifiedProfileByJsaId(jsaId: string): VerifiedProfile | null {
  const key = (jsaId || '').trim();
  if (!key) return null;
  return byJsaId.get(key) ?? null;
}

/**
 * Resolve the best available verified profile for a UI identity.
 * Prefers deterministic JSA ID lookup, then falls back to shikona matching.
 */
export function getVerifiedProfileForIdentity(
  jsaId?: string | null,
  shikona?: string | null,
): VerifiedProfile | null {
  if (jsaId) {
    const byId = getVerifiedProfileByJsaId(jsaId);
    if (byId) return byId;
  }
  if (shikona) {
    return getVerifiedProfile(shikona);
  }
  return null;
}

/**
 * Returns the official image URL only when confidence is "verified".
 * Returns '' otherwise (non-verified or null profile → placeholder).
 */
export function getVerifiedImageUrl(profile: VerifiedProfile | null): string {
  if (!profile) return '';
  if (
    profile.imageConfidence === 'verified' &&
    typeof profile.officialImageUrl === 'string' &&
    profile.officialImageUrl.trim()
  ) {
    return profile.officialImageUrl.trim();
  }
  return '';
}

export function getVerifiedDatasetMetrics(): VerifiedDatasetMetrics {
  return datasetMetrics;
}

export function formatVerifiedBasho(value: string | null | undefined): string {
  if (!value) return 'Not published';
  return bashoDisplayName(value);
}

export function getProfileConfidencePresentation(
  confidence: ProfileConfidence | null | undefined,
): TrustPresentation {
  return PROFILE_PRESENTATION[confidence ?? 'unverified'] ?? PROFILE_PRESENTATION.unverified;
}

export function getImageConfidencePresentation(
  confidence: ImageConfidence | null | undefined,
): TrustPresentation {
  return IMAGE_PRESENTATION[confidence ?? 'missing'] ?? IMAGE_PRESENTATION.missing;
}

export function getProvenanceStatusPresentation(
  status: ProvenanceStatus | null | undefined,
): TrustPresentation {
  return PROVENANCE_PRESENTATION[status ?? 'unresolved'] ?? PROVENANCE_PRESENTATION.unresolved;
}

/**
 * Convenience: resolve a verified image URL directly from a shikona string.
 * Returns '' if the wrestler isn't in the verified set or image isn't verified.
 */
export function resolveVerifiedImageUrl(shikona: string): string {
  return getVerifiedImageUrl(getVerifiedProfile(shikona));
}

/**
 * Check whether any verified profile data exists for a given shikona.
 */
export function hasVerifiedProfile(shikona: string): boolean {
  return getVerifiedProfile(shikona) !== null;
}

/**
 * Get the full list of verified profiles (read-only).
 */
export function getAllVerifiedProfiles(): readonly VerifiedProfile[] {
  return profiles;
}
