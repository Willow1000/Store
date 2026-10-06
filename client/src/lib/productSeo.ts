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

export function buildProductSeoTitle(productTitle: string): string {
  return fitSeoTitle(productTitle);
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
}: {
  title: string;
  condition?: string | null;
  itemSpecifics?: unknown;
}): string {
  const cleanTitle = title.replace(/\s+/g, " ").trim();
  const conditionLabel = String(condition || "").trim();
  const lead =
    conditionLabel &&
    !cleanTitle.toLowerCase().includes(conditionLabel.toLowerCase())
      ? `${conditionLabel} ${cleanTitle}`
      : cleanTitle;
  const facts = extractFacts(itemSpecifics);
  const text = facts.length
    ? `${lead}. ${facts.join(". ")}.`
    : `${lead}. Buy online at MotorVault.`;
  return clip(text, DESCRIPTION_LIMIT);
}
