import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { buildRobotsTxt } from "./seo";

describe("robots.txt", () => {
  // Vercel serves client/public/robots.txt from its static layer before the
  // request ever reaches the /robots.txt route, so the static file is the one
  // crawlers get. It drifted from buildRobotsTxt() once already; regenerate it
  // from the builder whenever this fails.
  it("static copy matches the builder", () => {
    const staticCopy = readFileSync(
      path.resolve(import.meta.dirname, "../../client/public/robots.txt"),
      "utf8"
    );
    expect(staticCopy).toBe(buildRobotsTxt("https://www.motorvault.shop"));
  });

  it("lets crawlers reach paginated listings", () => {
    expect(buildRobotsTxt("https://www.motorvault.shop")).not.toContain(
      "page="
    );
  });
});
