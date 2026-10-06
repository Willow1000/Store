import { describe, expect, it } from "vitest";
import { BLOG_POSTS } from "./blogPosts";
import {
  GUIDE_TITLES,
  getGuidesForCategory,
  getGuidesForVehicle,
} from "./guideLinks";
import { VEHICLES, vehiclesMatchingTitle } from "./vehicleContent";

describe("guide links", () => {
  it("names every guide by its post's current title", () => {
    const titles = Object.fromEntries(
      BLOG_POSTS.map(post => [post.slug, post.title])
    );
    expect(GUIDE_TITLES).toEqual(titles);
  });

  it("gives every vehicle page at least one guide", () => {
    VEHICLES.forEach(vehicle => {
      expect(getGuidesForVehicle(vehicle.slug).length).toBeGreaterThan(0);
    });
  });

  it("links a category to its guides and nothing to an unknown one", () => {
    expect(getGuidesForCategory("seats").map(link => link.href)).toEqual([
      "/blog/recaro-seats-buying-and-fitment-guide-europe",
      "/blog/car-seat-replacement-airbags-sensors-fitment",
    ]);
    expect(getGuidesForCategory("no-such-category")).toEqual([]);
    expect(getGuidesForCategory(null)).toEqual([]);
  });

  it("keeps guides off pages that never reach a crawler", () => {
    BLOG_POSTS.forEach(post => {
      post.internalLinks.forEach(link => {
        expect(link.href.startsWith("/search")).toBe(false);
      });
    });
  });
});

describe("vehiclesMatchingTitle", () => {
  it("finds the vehicle pages a product belongs on", () => {
    const slugs = (title: string) =>
      vehiclesMatchingTitle(title).map(vehicle => vehicle.slug);
    expect(
      slugs("Hinge Steps For 2007-2026 Jeep Wrangler Jk/jl, Gladiator jt")
    ).toEqual(["jeep-wrangler", "jeep-gladiator"]);
    expect(slugs("Tonneau Cover for 2015-2026 Ford F-150")).toEqual([
      "ford-f150",
    ]);
    expect(slugs("Ceramic Brake Pads")).toEqual([]);
    expect(slugs(null)).toEqual([]);
  });
});
