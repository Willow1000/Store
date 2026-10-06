/**
 * One URL form per category: `/products?category=<slug>`. The catalogue stores
 * the category NAME on each product ("Engines") while the canonical URL and the
 * XML sitemap use the SLUG ("engine"), so every link the UI generates should go
 * through here rather than interpolating a name.
 */

type CategoryLike = {
  name?: string | null;
  slug?: string | null;
};

const normalize = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

/** Finds a category by slug or by name (case-insensitive). */
export function resolveCategory<T extends CategoryLike>(
  categories: T[] | null | undefined,
  slugOrName: string | null | undefined
): T | null {
  const wanted = normalize(slugOrName);
  if (!wanted || !categories) return null;
  return (
    categories.find(category => normalize(category.slug) === wanted) ||
    categories.find(category => normalize(category.name) === wanted) ||
    null
  );
}

export function categoryHref(slugOrName: string) {
  return `/products?category=${encodeURIComponent(slugOrName)}`;
}

/**
 * Link for a category given whatever identifier is at hand (usually a
 * product's `category_name`). Uses the slug when the category list is loaded;
 * until then it falls back to the given value, which the listing page also
 * understands and canonicalises.
 */
export function categoryHrefFor(
  categories: CategoryLike[] | null | undefined,
  slugOrName: string | null | undefined
) {
  if (!slugOrName) return "/products";
  const match = resolveCategory(categories, slugOrName);
  return categoryHref(match?.slug || match?.name || slugOrName);
}
