/**
 * Verified Rikishi Profile Adapter
 * ==================================
 * Loads the JSA-verified rikishi profile dataset and provides
 * deterministic lookups by shikona (short or full) and JSA rikishi ID.
 *
 * Covers Makuuchi roster, historical legends, and Jūryō divisions.
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ImageConfidence = 'verified' | 'likely' | 'unverified' | 'missing';
export type ProfileConfidence = 'verified' | 'likely' | 'unverified';

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
}

// ---------------------------------------------------------------------------
// Build lookup indexes (runs once at module load)
// ---------------------------------------------------------------------------

const profiles: VerifiedProfile[] = rawProfiles as VerifiedProfile[];

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
