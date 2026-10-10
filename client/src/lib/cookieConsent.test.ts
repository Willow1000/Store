import { describe, expect, it } from "vitest";
import { isMarketingAllowed, requiresOptIn } from "./cookieConsent";

describe("cookie consent", () => {
  it("requires opt-in in the EEA, UK and Switzerland, and when unknown", () => {
    expect(requiresOptIn("NL")).toBe(true);
    expect(requiresOptIn("de")).toBe(true);
    expect(requiresOptIn("GB")).toBe(true);
    expect(requiresOptIn("CH")).toBe(true);
    expect(requiresOptIn(null)).toBe(true);
    expect(requiresOptIn("")).toBe(true);
    expect(requiresOptIn("US")).toBe(false);
    expect(requiresOptIn("KE")).toBe(false);
  });

  it("lets a stored choice override the regional default", () => {
    const decidedAt = "2026-10-10T00:00:00.000Z";
    expect(isMarketingAllowed(null, "US")).toBe(true);
    expect(isMarketingAllowed(null, "NL")).toBe(false);
    expect(isMarketingAllowed(null, null)).toBe(false);
    expect(isMarketingAllowed({ marketing: false, decidedAt }, "US")).toBe(
      false
    );
    expect(isMarketingAllowed({ marketing: true, decidedAt }, "NL")).toBe(true);
  });
});
