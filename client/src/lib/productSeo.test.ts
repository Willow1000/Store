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
    // Never clipped: the vehicle at the end is what buyers search for.
    expect(long).toBe(
      "3W Tape-On Window Rain Guards for 2015-2026 Ford F-150 SuperCrew Cab, 4 Pieces"
    );
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

  it("describes the item from its record when there are no spec lines", () => {
    expect(
      buildProductMetaDescription({
        title: "M113 V8",
        condition: "Used",
        itemSpecifics: null,
        brand: "Mercedes",
        partNumber: "A1130100000",
        category: "Engines",
      })
    ).toBe(
      "Used M113 V8. Brand: Mercedes. Part number: A1130100000. Category: Engines."
    );
    expect(
      buildProductMetaDescription({
        title: "Floor mats",
        condition: "New",
        itemSpecifics: "Item specifics not provided",
      })
    ).toBe("New Floor mats.");
  });

  it("drops a fact that does not fit instead of cutting it", () => {
    const description = buildProductMetaDescription({
      title:
        "Supreme Suspensions 3 in Front Leveling Kit for 2004-2014 Ford F-150 2WD and 4WD",
      condition: "New",
      itemSpecifics:
        "Brand: Supreme Suspensions\nPart Type: Leveling Kit\nPart Number: FDF104FL3000-EXTRA-LONG-NUMBER\nMaterial: Billet aluminium",
    });
    expect(description.endsWith("…")).toBe(false);
    expect(description.length).toBeLessThanOrEqual(155);
  });
});
