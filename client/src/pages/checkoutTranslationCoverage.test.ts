// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { setSiteLanguage, translateText } from "@/lib/language";

const SOURCES = [
  "client/src/pages/Checkout.tsx",
  "client/src/components/checkout/CheckoutAddressFields.tsx",
];

const LANGUAGES = ["de", "it", "fr", "es", "nl"] as const;

/**
 * Correct translations that happen to be spelled exactly like the English.
 * Without this the coverage check reports them as missing entries forever.
 */
const IDENTICAL_BY_LANGUAGE: Partial<
  Record<(typeof LANGUAGES)[number], Set<string>>
> = {
  it: new Set(["checkout.email"]),
  fr: new Set(["checkout.total"]),
  es: new Set(["checkout.subtotal", "checkout.total"]),
};

/** Every t()/checkoutText() key the checkout flow asks for, with its fallback. */
function collectKeys(): Array<[string, string]> {
  const found = new Map<string, string>();
  for (const file of SOURCES) {
    const source = fs.readFileSync(path.resolve(file), "utf-8");
    const pattern = /\b(?:t|checkoutText)\(\s*"([^"]+)"\s*,\s*"([^"]*)"/g;
    for (const match of source.matchAll(pattern)) {
      if (!found.has(match[1])) found.set(match[1], match[2]);
    }
  }
  return [...found.entries()];
}

describe("checkout translation coverage", () => {
  const keys = collectKeys();

  it("finds the keys the checkout flow actually uses", () => {
    expect(keys.length).toBeGreaterThan(30);
  });

  it("has a translation for every checkout key in every language", () => {
    // A key with no entry silently renders English, which is how the whole
    // checkout flow stayed untranslated in the first place. Fail loudly here
    // instead so a newly added string cannot slip through.
    const gaps: string[] = [];

    for (const language of LANGUAGES) {
      setSiteLanguage(language);
      for (const [key, fallback] of keys) {
        // A postcode example is intentionally a number in some locales.
        if (key === "checkout.zipPlaceholder") continue;
        // Words that are genuinely identical to English in this language, so
        // matching the fallback is the correct translation rather than a gap.
        if (IDENTICAL_BY_LANGUAGE[language]?.has(key)) continue;
        if (translateText(language, key, fallback) === fallback) {
          gaps.push(`${language}: ${key}`);
        }
      }
    }

    expect(gaps).toEqual([]);
  });
});
