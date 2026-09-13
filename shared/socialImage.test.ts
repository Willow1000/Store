import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getSocialImageUrl } from "./socialImage";
import { BLOG_POSTS } from "./blogPosts";

describe("getSocialImageUrl", () => {
  it("maps an AVIF cover to its JPEG sibling", () => {
    expect(
      getSocialImageUrl("/images/blog/recaro-seats-guide-cover.avif")
    ).toBe("/images/blog/social/recaro-seats-guide-cover-og.jpg");
  });

  it("leaves scraper-friendly formats untouched", () => {
    for (const url of ["/images/a.jpg", "/images/a.png", "/images/a.webp"]) {
      expect(getSocialImageUrl(url)).toBe(url);
    }
  });

  it("handles empty input without throwing", () => {
    expect(getSocialImageUrl("")).toBe("");
  });
});

describe("blog social previews", () => {
  it("ships a real JPEG for every post's og:image", () => {
    // Social scrapers (Facebook, LinkedIn, X) do not fetch AVIF, so a blog post
    // whose og:image is the raw AVIF cover shares with no preview image at all.
    const missing: string[] = [];

    for (const post of BLOG_POSTS) {
      const social = getSocialImageUrl(post.coverImage);
      expect(social).toMatch(/\.(jpg|jpeg|png|webp)$/i);

      const onDisk = path.resolve("client/public" + social);
      if (!fs.existsSync(onDisk)) missing.push(`${post.slug} -> ${social}`);
    }

    expect(missing).toEqual([]);
  });

  it("uses only url-safe ascii cover paths", () => {
    const unsafe = BLOG_POSTS.filter(p =>
      /[^\x20-\x7E]/.test(p.coverImage)
    ).map(p => p.slug);
    expect(unsafe).toEqual([]);
  });
});
