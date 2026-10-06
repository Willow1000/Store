import { describe, expect, it } from "vitest";
import { applyOffer } from "./offers";

const base = {
  id: 7,
  code: "QDNPL9",
  name: "Ten off",
  description: null,
  type: "percentage",
  value: "10.00",
  minimumSubtotal: null,
  maxUses: null,
  usedCount: 0,
  active: true,
  startsAt: null,
  endsAt: null,
};
const now = new Date("2026-10-04T12:00:00Z");

describe("applyOffer", () => {
  it("prices a percentage offer against the subtotal", () => {
    expect(applyOffer(base, 145.5, now)?.discountAmount).toBe(14.55);
  });

  it("caps a fixed offer at the subtotal", () => {
    const offer = { ...base, type: "fixed", value: "50" };
    expect(applyOffer(offer, 30, now)?.discountAmount).toBe(30);
    expect(applyOffer(offer, 80, now)?.discountAmount).toBe(50);
  });

  it("rejects inactive, expired, not-yet-started, used-up and under-minimum offers", () => {
    expect(applyOffer({ ...base, active: false }, 100, now)).toBeNull();
    expect(
      applyOffer({ ...base, endsAt: "2026-10-01T00:00:00Z" }, 100, now)
    ).toBeNull();
    expect(
      applyOffer({ ...base, startsAt: "2026-10-05T00:00:00Z" }, 100, now)
    ).toBeNull();
    expect(
      applyOffer({ ...base, maxUses: 3, usedCount: 3 }, 100, now)
    ).toBeNull();
    expect(
      applyOffer({ ...base, minimumSubtotal: "200" }, 100, now)
    ).toBeNull();
  });

  it("never discounts more than the whole subtotal", () => {
    expect(applyOffer({ ...base, value: "250" }, 80, now)?.discountAmount).toBe(
      80
    );
  });
});
