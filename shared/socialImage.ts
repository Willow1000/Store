/**
 * Social preview (og:image) URL for a blog cover.
 *
 * Covers are authored as AVIF, which is right for on-page rendering but is not
 * a format the major social scrapers fetch - Facebook, LinkedIn and X all
 * expect JPEG/PNG. Pointing og:image straight at the AVIF meant shared blog
 * links rendered with no preview image at all.
 *
 * Every cover therefore ships a 1200x630 JPEG sibling under
 * /images/blog/social/, built from the same source art. The on-page <img> keeps
 * using the AVIF, so page weight is unchanged.
 *
 * Falls back to the original path for any cover that is already a
 * scraper-friendly format, or that has no generated sibling.
 */
const SOCIAL_DIR = "/images/blog/social";
const NEEDS_SOCIAL_VARIANT = /\.avif$/i;

export function getSocialImageUrl(coverImage: string): string {
  if (!coverImage || !NEEDS_SOCIAL_VARIANT.test(coverImage)) return coverImage;

  const fileName = coverImage.split("/").pop();
  if (!fileName) return coverImage;

  const stem = fileName.replace(NEEDS_SOCIAL_VARIANT, "");
  return `${SOCIAL_DIR}/${stem}-og.jpg`;
}
