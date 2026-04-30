export function getHighResImageUrl(url: string | null | undefined): string {
  if (!url) return '';

  let normalized = url.trim();

  // eBay thumbnails are often served from /thumbs/images/... and low s-lNNN sizes.
  normalized = normalized.replace('/thumbs/images/', '/images/');
  normalized = normalized.replace(/s-l\d+(\.(?:jpe?g|png|webp))/i, 's-l1600$1');

  return normalized;
}