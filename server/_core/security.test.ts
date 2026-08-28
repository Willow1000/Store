import { describe, expect, it } from "vitest";
import { isValidConfiguredOrigin } from "./security";

describe("isValidConfiguredOrigin", () => {
  it("accepts a well-formed http/https URL", () => {
    expect(isValidConfiguredOrigin("https://motorvault.shop")).toBe(true);
    expect(isValidConfiguredOrigin("http://localhost:3001")).toBe(true);
  });

  it("rejects the unfilled placeholder domain", () => {
    expect(isValidConfiguredOrigin("https://your-production-domain.com")).toBe(
      false
    );
  });

  it("rejects empty, undefined, and non-URL values", () => {
    expect(isValidConfiguredOrigin(undefined)).toBe(false);
    expect(isValidConfiguredOrigin("")).toBe(false);
    expect(isValidConfiguredOrigin("not a url")).toBe(false);
  });

  it("rejects non-http(s) protocols", () => {
    expect(isValidConfiguredOrigin("ftp://example.com")).toBe(false);
  });
});
