import { describe, expect, it } from "vitest";
import {
  isZeroDecimalCurrency,
  normalizeCurrencyCode,
  resolveChargeCurrency,
  toStripeMinorUnits,
} from "./currency";

describe("normalizeCurrencyCode", () => {
  it("uppercases and trims a valid code", () => {
    expect(normalizeCurrencyCode(" eur ")).toBe("EUR");
  });

  it("falls back to USD for anything that is not a 3-letter code", () => {
    for (const bad of [undefined, null, "", "EURO", "E", 42, {}]) {
      expect(normalizeCurrencyCode(bad)).toBe("USD");
    }
  });
});

describe("resolveChargeCurrency", () => {
  it("keeps currencies Stripe is configured to accept", () => {
    expect(resolveChargeCurrency("EUR")).toBe("EUR");
    expect(resolveChargeCurrency("gbp")).toBe("GBP");
  });

  it("falls back to USD rather than creating a session Stripe will reject", () => {
    // A currency the storefront might detect from geo but that this
    // integration does not charge in would otherwise strand the customer at
    // checkout with a Stripe error.
    expect(resolveChargeCurrency("KES")).toBe("USD");
    expect(resolveChargeCurrency("ZWL")).toBe("USD");
  });
});

describe("toStripeMinorUnits", () => {
  it("multiplies by 100 for ordinary currencies", () => {
    expect(toStripeMinorUnits(12.34, "EUR")).toBe(1234);
    expect(toStripeMinorUnits(0.99, "USD")).toBe(99);
  });

  it("does NOT multiply zero-decimal currencies", () => {
    // Sending 4500 for a 4500 JPY charge would bill the customer 100x.
    expect(toStripeMinorUnits(4500, "JPY")).toBe(4500);
    expect(toStripeMinorUnits(1200, "KRW")).toBe(1200);
    expect(isZeroDecimalCurrency("JPY")).toBe(true);
    expect(isZeroDecimalCurrency("EUR")).toBe(false);
  });

  it("rounds three-decimal currencies to a multiple of ten minor units", () => {
    const amount = toStripeMinorUnits(12.345, "KWD");
    expect(amount % 10).toBe(0);
  });

  it("treats non-positive or non-finite amounts as zero", () => {
    expect(toStripeMinorUnits(0, "EUR")).toBe(0);
    expect(toStripeMinorUnits(-5, "EUR")).toBe(0);
    expect(toStripeMinorUnits(Number.NaN, "EUR")).toBe(0);
  });

  it("rounds rather than truncating", () => {
    expect(toStripeMinorUnits(10.005, "EUR")).toBe(1001);
    expect(toStripeMinorUnits(10.004, "EUR")).toBe(1000);
  });
});
