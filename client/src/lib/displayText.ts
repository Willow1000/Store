/**
 * Guards for free-text catalogue fields that are sometimes filled with
 * keyboard-mash placeholders ("nnn", "kk"). Nothing here edits data; it only
 * decides whether a value is fit to show to shoppers or search engines.
 */

/** True when `value` reads like real copy rather than a placeholder. */
export function isMeaningfulText(
  value: string | null | undefined,
  minLength = 20
): value is string {
  if (!value) return false;
  const text = value.trim();
  if (text.length < minLength) return false;
  // Real descriptions have several words; "nnnnnnnnnnnnnnnnnnnnnn" does not.
  if (text.split(/\s+/).length < 3) return false;
  // Reject a single character repeated ("aaaa aaaa aaaa").
  if (new Set(text.replace(/\s+/g, "").toLowerCase()).size < 4) return false;
  return true;
}

/** True only for an actual emoji/pictograph, never for stray letters. */
export function isEmojiIcon(value: string | null | undefined): value is string {
  if (!value) return false;
  const text = value.trim();
  if (!text || text.length > 8) return false;
  return /\p{Extended_Pictographic}/u.test(text) && !/[a-z0-9]/i.test(text);
}
