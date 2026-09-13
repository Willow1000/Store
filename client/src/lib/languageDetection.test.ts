// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import {
  clearSiteLanguageOverride,
  detectLanguageFromGeo,
  getSiteLanguage,
  initializeSiteLanguage,
  setSiteLanguage,
} from "./language";

const geo = (country: string, state = "") =>
  ({ location: { country_code2: country, state_prov: state } }) as never;

describe("detectLanguageFromGeo", () => {
  it("maps regions to the languages the storefront supports", () => {
    const expected: Record<string, string> = {
      DE: "de",
      AT: "de",
      IT: "it",
      FR: "fr",
      ES: "es",
      NL: "nl",
      // English-speaking and override regions stay on English by design.
      GB: "en",
      IE: "en",
      US: "en",
      KE: "en",
    };
    for (const [country, language] of Object.entries(expected)) {
      expect(`${country}=${detectLanguageFromGeo(geo(country))}`).toBe(
        `${country}=${language}`
      );
    }
  });
});

describe("manual override", () => {
  beforeEach(() => localStorage.clear());

  it("applies the detected language when nothing is pinned", () => {
    expect(initializeSiteLanguage(geo("DE"))).toBe("de");
    expect(getSiteLanguage()).toBe("de");
  });

  it("stops detecting once a language is picked manually", () => {
    setSiteLanguage("fr");
    // Region detection must not override a deliberate choice.
    expect(initializeSiteLanguage(geo("DE"))).toBe("fr");
  });

  it("resumes detecting after the override is cleared", () => {
    setSiteLanguage("fr");
    expect(initializeSiteLanguage(geo("DE"))).toBe("fr");

    // Without this escape hatch, a visitor who ever touched the language
    // selector had region detection disabled permanently on that browser.
    expect(clearSiteLanguageOverride(geo("DE"))).toBe("de");
    expect(initializeSiteLanguage(geo("IT"))).toBe("it");
  });
});
