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
 * Resolution order:
 *   1. Verified Makuuchi profile (imageConfidence === "verified" only)
 *   2. wrestler.official_image_url  (legacy field)
 *   3. wrestler.image.url           (Wikimedia/Wikipedia fallback)
 *   4. '' → triggers FallbackAvatar placeholder
 */
export function resolvePhotoUrl(wrestler) {
  // 1. Check JSA-verified profiles first (highest confidence)
  const shikona = typeof wrestler?.shikona === 'string' ? wrestler.shikona.trim() : '';
  if (shikona) {
    const verifiedUrl = resolveVerifiedImageUrl(shikona);
    if (verifiedUrl) return verifiedUrl;
  }

  // 2. Legacy official_image_url field
  const official = typeof wrestler?.official_image_url === 'string' ? wrestler.official_image_url.trim() : '';
  if (isUsableHttpUrl(official)) return official;

  // 3. Nested image.url (Wikimedia/Wikipedia)
  const imageUrl = typeof wrestler?.image?.url === 'string' ? wrestler.image.url.trim() : '';
  if (isUsableHttpUrl(imageUrl)) return imageUrl;

  return '';
}
