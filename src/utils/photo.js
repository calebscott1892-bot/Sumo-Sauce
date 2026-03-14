import { resolveVerifiedImageUrl } from '@/data/verifiedProfiles';

export function isUsableHttpUrl(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^https?:\/\//i.test(trimmed);
}

/**
 * Resolve the best available photo URL for a wrestler.
 *
 * TRUST RULE — only images that have passed the verified-profile
 * confidence gate (imageConfidence === "verified") are returned.
 * All other cases return '' which triggers the FallbackAvatar
 * placeholder.  Raw API fields like official_image_url or
 * image.url are intentionally NOT used here because they have
 * no confidence metadata.
 */
export function resolvePhotoUrl(wrestler) {
  const shikona = typeof wrestler?.shikona === 'string' ? wrestler.shikona.trim() : '';
  if (shikona) {
    const verifiedUrl = resolveVerifiedImageUrl(shikona);
    if (verifiedUrl) return verifiedUrl;
  }

  // No verified image available → placeholder
  return '';
}
