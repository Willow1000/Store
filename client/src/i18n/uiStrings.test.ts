import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UI_STRINGS, getUiStringPairs, getUiStringValues } from "./uiStrings";
import { preloadTranslations } from "@/lib/autoTranslate";

const LANGUAGES = ["de", "it", "fr", "es", "nl"] as const;

describe("UI string dictionary", () => {
  it("has a non-empty translation for every language", () => {
    const gaps: string[] = [];
    Object.entries(UI_STRINGS).forEach(([source, byLanguage]) => {
      LANGUAGES.forEach(language => {
        const value = byLanguage[language];
        if (!value || !value.trim()) gaps.push(`${source} -> ${language}`);
      });
    });
    expect(gaps).toEqual([]);
  });

  it("does not leave a source string untranslated", () => {
    // A value identical to its English source is almost always a missed entry.
    // 'Blog' and 'Contact' are genuinely identical in several languages.
    // Strings that are legitimately identical to English in at least one of
    // these languages ("Support" in German, "Legal" in Spanish, and so on).
    const allowed = new Set([
      "Blog",
      "Contact",
      "FAQ",
      "Model",
      "Filters",
      "Popular",
      "Description",
      "In Stock",
      "Support",
      "Legal",
    ]);
    const suspicious: string[] = [];
    Object.entries(UI_STRINGS).forEach(([source, byLanguage]) => {
      if (allowed.has(source)) return;
      LANGUAGES.forEach(language => {
        if (byLanguage[language] === source)
          suspicious.push(`${source} -> ${language}`);
      });
    });
    expect(suspicious).toEqual([]);
  });

  it("exposes pairs and values consistently", () => {
    const pairs = getUiStringPairs("de");
    const values = getUiStringValues("de");
    expect(pairs.length).toBeGreaterThan(40);
    pairs.forEach(([, translated]) => expect(values).toContain(translated));
  });
});

describe("translation network behaviour", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn(async () => ({
      ok: true,
      json: async () => [[["übersetzt", "", "", ""]]],
    }));
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("translates dictionary-backed chrome without any network request", async () => {
    await preloadTranslations("de", [
      "Products",
      "Cart",
      "Filters",
      "Sort By",
      "Add to Cart",
    ]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not re-send text that is already localised", async () => {
    // "Produkte" is what the dictionary renders for "Products"; seeing it in the
    // DOM means a component already localised it, so it must not be sent back.
    await preloadTranslations("de", ["Produkte", "Warenkorb"]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("still goes to the network for content outside the dictionary", async () => {
    await preloadTranslations("de", [
      "Bosch 0281002216 diesel injector rail sensor",
    ]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
