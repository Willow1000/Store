/** Products per listing page, shared by the server render and the browser. */
export const PRODUCTS_PER_PAGE = 32;

/**
 * The page number in a listing URL's query string. Anything that is not a
 * whole number above 1 is page 1, so page 1 only ever has one URL (the one
 * without the parameter).
 */
export function getPageFromSearch(search: string | URLSearchParams): number {
  const params =
    typeof search === "string" ? new URLSearchParams(search) : search;
  const raw = (params.get("page") || "").trim();
  if (!/^[1-9]\d{0,5}$/.test(raw)) return 1;
  return Number(raw);
}

/** The same listing URL for another page; page 1 drops the parameter. */
export function buildListingPageUrl(
  pathname: string,
  search: string | URLSearchParams,
  page: number
): string {
  const params = new URLSearchParams(
    typeof search === "string" ? search : search.toString()
  );
  if (page > 1) {
    params.set("page", String(page));
  } else {
    params.delete("page");
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function countListingPages(total: number): number {
  return Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE));
}
