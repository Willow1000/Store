// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import { t } from "./Checkout";
import { setSiteLanguage } from "@/lib/language";

/**
 * Checkout's `t()` used to ignore its key and return the English fallback
 * unconditionally, so the entire checkout flow stayed in English regardless of
 * the site language. These assert it actually resolves through the dictionary.
 */
describe("checkout translation", () => {
  beforeEach(() => localStorage.clear());

  it("returns English when the site language is English", () => {
    setSiteLanguage("en");
    expect(t("checkout.payNow", "Pay Now")).toBe("Pay Now");
  });

  it("translates checkout copy for each supported language", () => {
    const expected: Record<string, string> = {
      de: "Jetzt bezahlen",
      it: "Paga ora",
      fr: "Payer maintenant",
      es: "Pagar ahora",
      nl: "Nu betalen",
    };

    for (const [language, translated] of Object.entries(expected)) {
      setSiteLanguage(language as never);
      expect(`${language}=${t("checkout.payNow", "Pay Now")}`).toBe(
        `${language}=${translated}`
      );
    }
  });

  it("covers the whole checkout flow, not just one string", () => {
    setSiteLanguage("de");
    const keys: Array<[string, string]> = [
      ["checkout.secureCheckout", "Secure Checkout"],
      ["checkout.paymentMethod", "Payment Method"],
      ["checkout.orderSummary", "Order Summary"],
      ["checkout.reviewYourOrder", "Review Your Order"],
      ["common.back", "Back"],
    ];
    const untranslated = keys.filter(
      ([key, fallback]) => t(key, fallback) === fallback
    );
    expect(untranslated).toEqual([]);
  });

  it("falls back to English for a key with no entry", () => {
    setSiteLanguage("de");
    expect(t("checkout.notAKeyThatExists", "Some new string")).toBe(
      "Some new string"
    );
  });
});
