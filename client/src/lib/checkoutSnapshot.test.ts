import { beforeEach, describe, expect, it } from "vitest";
import {
  CHECKOUT_CART_SNAPSHOT_KEY,
  readCheckoutSnapshot,
  writeCheckoutSnapshot,
  clearCheckoutData,
  isValidCartItem,
  validateCheckoutSnapshot,
  hasTrackedMetaPurchase,
  markTrackedMetaPurchase,
  type CartItem,
} from "./checkoutSnapshot";

const sampleItem: CartItem = {
  product_id: "abc-123",
  title: "New wheels for Ducato",
  price: "$ 1300.00",
  image: "https://example.com/wheel.jpg",
  quantity: 1,
};

// This suite runs under vitest's default "node" environment (no DOM), but
// checkoutSnapshot.ts branches on `typeof window` and reads/writes
// localStorage - a minimal in-memory stand-in for both is enough to
// exercise its real logic without pulling in a full jsdom environment.
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

beforeEach(() => {
  const storage = new MemoryStorage();
  (globalThis as any).window = globalThis;
  (globalThis as any).localStorage = storage;
});

describe("readCheckoutSnapshot / writeCheckoutSnapshot", () => {
  it("round-trips a written snapshot", () => {
    writeCheckoutSnapshot([sampleItem]);
    expect(readCheckoutSnapshot()).toEqual([sampleItem]);
  });

  it("returns an empty array when nothing is stored", () => {
    expect(readCheckoutSnapshot()).toEqual([]);
  });

  it("returns an empty array for malformed JSON instead of throwing", () => {
    localStorage.setItem(CHECKOUT_CART_SNAPSHOT_KEY, "{not valid json");
    expect(readCheckoutSnapshot()).toEqual([]);
  });

  it("returns an empty array when the stored value isn't an array", () => {
    localStorage.setItem(CHECKOUT_CART_SNAPSHOT_KEY, JSON.stringify({}));
    expect(readCheckoutSnapshot()).toEqual([]);
  });
});

describe("clearCheckoutData", () => {
  it("removes the snapshot, step, form data, and guest cart keys", () => {
    writeCheckoutSnapshot([sampleItem]);
    localStorage.setItem("checkout-step", "review");
    localStorage.setItem("checkout-form-data", "{}");
    localStorage.setItem("cart", "[]");

    clearCheckoutData();

    expect(localStorage.getItem(CHECKOUT_CART_SNAPSHOT_KEY)).toBeNull();
    expect(localStorage.getItem("checkout-step")).toBeNull();
    expect(localStorage.getItem("checkout-form-data")).toBeNull();
    expect(localStorage.getItem("cart")).toBeNull();
  });
});

describe("isValidCartItem", () => {
  it("accepts a well-formed cart item", () => {
    expect(isValidCartItem(sampleItem)).toBe(true);
  });

  it.each([
    ["not an object", "just a string"],
    ["null", null],
    ["missing quantity", { ...sampleItem, quantity: undefined }],
    ["zero quantity", { ...sampleItem, quantity: 0 }],
    ["negative quantity", { ...sampleItem, quantity: -1 }],
    ["non-string price", { ...sampleItem, price: 1300 }],
    ["missing product_id", { ...sampleItem, product_id: undefined }],
  ])("rejects %s", (_label, value) => {
    expect(isValidCartItem(value)).toBe(false);
  });
});

describe("validateCheckoutSnapshot", () => {
  it("filters out invalid entries and keeps valid ones", () => {
    const result = validateCheckoutSnapshot([
      sampleItem,
      { bogus: true },
      { ...sampleItem, quantity: -5 },
    ]);
    expect(result).toEqual([sampleItem]);
  });

  it("returns an empty array for non-array input", () => {
    expect(validateCheckoutSnapshot("not an array" as any)).toEqual([]);
  });
});

describe("meta purchase tracking", () => {
  it("is untracked until markTrackedMetaPurchase is called", () => {
    expect(hasTrackedMetaPurchase("ref-1")).toBe(false);
    markTrackedMetaPurchase("ref-1");
    expect(hasTrackedMetaPurchase("ref-1")).toBe(true);
  });

  it("tracks references independently", () => {
    markTrackedMetaPurchase("ref-a");
    expect(hasTrackedMetaPurchase("ref-b")).toBe(false);
  });
});
