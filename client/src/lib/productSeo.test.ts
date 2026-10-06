import { describe, expect, it } from "vitest";
import {
  buildProductMetaDescription,
  buildProductSeoTitle,
} from "./productSeo";

describe("product SEO text", () => {
  it("keeps the brand suffix only when the title fits", () => {
    expect(buildProductSeoTitle("Bosch Wiper Set")).toBe(
      "Bosch Wiper Set | MotorVault"
    );
    const long = buildProductSeoTitle(
      "3W Tape-On Window Rain Guards for 2015-2026 Ford F-150 SuperCrew Cab, 4 Pieces"
    );
    expect(long.length).toBeLessThanOrEqual(60);
    expect(long).not.toContain("MotorVault");
    expect(long.endsWith("…")).toBe(true);
  });

  it("builds a unique description from the product's own facts", () => {
    const description = buildProductMetaDescription({
      title: "Skoda Fabia 2007-14 Seat Set",
      condition: "Used",
      itemSpecifics:
        "Product Overview\n\nBrand: Škoda\nModel: Fabia II (5J)\nModel Years: 2007–2014\nPart Type: Complete Seat Set\nSeat Heating: No",
    });
    expect(description).toBe(
      "Used Skoda Fabia 2007-14 Seat Set. Brand: Škoda. Model: Fabia II (5J). Model Years: 2007–2014. Part Type: Complete Seat Set."
    );
    expect(description.length).toBeLessThanOrEqual(155);
  });

  it("falls back to a short line when there are no usable facts", () => {
    expect(
      buildProductMetaDescription({
        title: "Floor mats",
        condition: "New",
        itemSpecifics: "Item specifics not provided",
      })
    ).toBe("New Floor mats. Buy online at MotorVault.");
  });
});
