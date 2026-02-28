export function isUsableHttpUrl(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^https?:\/\//i.test(trimmed);
}

export function resolvePhotoUrl(wrestler) {
  const official = typeof wrestler?.official_image_url === 'string' ? wrestler.official_image_url.trim() : '';
  if (isUsableHttpUrl(official)) return official;

  const imageUrl = typeof wrestler?.image?.url === 'string' ? wrestler.image.url.trim() : '';
  if (isUsableHttpUrl(imageUrl)) return imageUrl;

  return '';
}
