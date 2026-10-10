import { describe, expect, it } from "vitest";
import {
  buildListingPageUrl,
  countListingPages,
  getPageFromSearch,
} from "./listingPagination";

describe("listing pagination", () => {
  it("reads only whole page numbers above zero", () => {
    expect(getPageFromSearch("category=engine&page=3")).toBe(3);
    expect(getPageFromSearch("")).toBe(1);
    expect(getPageFromSearch("page=0")).toBe(1);
    expect(getPageFromSearch("page=-2")).toBe(1);
    expect(getPageFromSearch("page=2abc")).toBe(1);
    expect(getPageFromSearch("page=1.5")).toBe(1);
  });

  it("gives page 1 a single url without the parameter", () => {
    expect(buildListingPageUrl("/products", "category=engine&page=4", 1)).toBe(
      "/products?category=engine"
    );
    expect(buildListingPageUrl("/products", "page=2", 1)).toBe("/products");
    expect(buildListingPageUrl("/products", "category=engine", 2)).toBe(
      "/products?category=engine&page=2"
    );
  });

  it("counts pages of 32", () => {
    expect(countListingPages(0)).toBe(1);
    expect(countListingPages(32)).toBe(1);
    expect(countListingPages(33)).toBe(2);
    expect(countListingPages(569)).toBe(18);
  });
});
