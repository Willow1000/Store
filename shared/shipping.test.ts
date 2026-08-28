import { describe, expect, it } from "vitest";
import {
  calculateShipping,
  isFreeShippingEligible,
  getFreeShippingThresholdUsd,
  formatPrice,
} from "./shipping";

describe("calculateShipping", () => {
  it("charges 5% of subtotal below the free-shipping threshold", () => {
    expect(calculateShipping(250)).toBe(12.5);
    expect(calculateShipping(100)).toBe(5);
  });

  it("is free at and above the $1500 threshold", () => {
    expect(calculateShipping(1500)).toBe(0);
    expect(calculateShipping(2000)).toBe(0);
  });

  it("rounds to 2 decimal places", () => {
    expect(calculateShipping(33.33)).toBe(1.67);
  });

  it("treats zero, negative, and non-finite subtotals as zero shipping", () => {
    expect(calculateShipping(0)).toBe(0);
    expect(calculateShipping(-50)).toBe(0);
    expect(calculateShipping(NaN)).toBe(0);
    expect(calculateShipping(Infinity)).toBe(0);
  });
});

describe("isFreeShippingEligible", () => {
  it("matches the same $1500 threshold calculateShipping uses", () => {
    expect(isFreeShippingEligible(1499.99)).toBe(false);
    expect(isFreeShippingEligible(1500)).toBe(true);
  });
});

describe("getFreeShippingThresholdUsd", () => {
  it("returns 1500", () => {
    expect(getFreeShippingThresholdUsd()).toBe(1500);
  });
});

describe("formatPrice", () => {
  it("formats a number as USD currency", () => {
    expect(formatPrice(1300)).toBe("$1,300.00");
  });

  it("parses a string amount", () => {
    expect(formatPrice("1300.00")).toBe("$1,300.00");
  });
});
