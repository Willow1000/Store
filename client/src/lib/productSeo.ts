/**
 * Product <title> and meta description.
 *
 * Titles used to be "<full product title> | MotorVault" (median 80
 * characters, so Google cut most of them off), and every description was the
 * same sentence with the title dropped in. These keep titles to what a search
 * result shows and build each description from the product's own details.
 */

const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 155;
const BRAND_SUFFIX = " | MotorVault";

function clip(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-–(]+$/, "")}…`;
}

/**
 * "<title><suffix>" when that fits in a search result, otherwise the title
 * alone (clipped at a word if even that is too long) - the page's own name
 * matters more than the brand suffix.
 */
export function fitSeoTitle(rawTitle: string, suffix = BRAND_SUFFIX): string {
  const title = rawTitle.replace(/\s+/g, " ").trim();
  if (title.length + suffix.length <= TITLE_LIMIT) return `${title}${suffix}`;
  if (
    suffix !== BRAND_SUFFIX &&
    title.length + BRAND_SUFFIX.length <= TITLE_LIMIT
  )
    return `${title}${BRAND_SUFFIX}`;
  return clip(title, TITLE_LIMIT);
}

/**
 * Product titles are never clipped. Fitment sits at the end of most of them
 * ("... Leveling Kit for 2004-2014 Ford F-150"), so cutting at 60 characters
 * removed the vehicle - the part of the title buyers search for. A long title
 * only loses the brand suffix; the search engine shortens what it displays.
 */
export function buildProductSeoTitle(productTitle: string): string {
  const title = productTitle.replace(/\s+/g, " ").trim();
  return title.length + BRAND_SUFFIX.length <= TITLE_LIMIT
    ? `${title}${BRAND_SUFFIX}`
    : title;
}

/** Labels whose values describe the item well enough for a snippet. */
const USEFUL_FACTS =
  /^(brand|make|model|model years?|years?|fits|fitment|compatib\w*|vehicle|part type|type|engine|part number|includes|material|size|dimensions?|colou?r|finish|position)$/i;

function extractFacts(itemSpecifics: unknown): string[] {
  if (typeof itemSpecifics !== "string") return [];
  const facts: string[] = [];
  for (const rawLine of itemSpecifics.split(/\r?\n/)) {
    const match = /^\s*([^:]{2,30}):\s*(.+?)\s*$/.exec(rawLine);
    if (!match || !USEFUL_FACTS.test(match[1].trim())) continue;
    const value = match[2].replace(/\s+/g, " ");
    if (value.length > 60 || /not provided/i.test(value)) continue;
    facts.push(`${match[1].trim()}: ${value}`);
    if (facts.length === 4) break;
  }
  return facts;
}

export function buildProductMetaDescription({
  title,
  condition,
  itemSpecifics,
  brand,
  partNumber,
  category,
}: {
  title: string;
  condition?: string | null;
  itemSpecifics?: unknown;
  brand?: string | null;
  partNumber?: string | null;
  category?: string | null;
}): string {
  const cleanTitle = title.replace(/\s+/g, " ").trim();
  const conditionLabel = String(condition || "").trim();
  const lead =
    conditionLabel &&
    !cleanTitle.toLowerCase().includes(conditionLabel.toLowerCase())
      ? `${conditionLabel} ${cleanTitle}`
      : cleanTitle;
  let facts = extractFacts(itemSpecifics);
  if (facts.length === 0) {
    // No usable spec lines (most used parts): describe the item from its own
    // record rather than a sentence that is identical on every such page.
    facts = [
      brand?.trim() ? `Brand: ${brand.trim()}` : "",
      partNumber?.trim() ? `Part number: ${partNumber.trim()}` : "",
      category?.trim() ? `Category: ${category.trim()}` : "",
    ].filter(Boolean);
  }
  if (facts.length === 0) return clip(`${lead}.`, DESCRIPTION_LIMIT);

  // Whole facts only: stop before the one that would not fit, instead of
  // cutting a spec off mid-word.
  let text = `${lead}.`;
  for (const fact of facts) {
    if (text.length + fact.length + 2 > DESCRIPTION_LIMIT) break;
    text += ` ${fact}.`;
  }
  return clip(text, DESCRIPTION_LIMIT);
}
