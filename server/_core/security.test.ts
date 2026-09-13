import { describe, expect, it } from "vitest";
import type express from "express";
import { applySecurityHeaders, isValidConfiguredOrigin } from "./security";

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

describe("Content-Security-Policy trusted-types", () => {
  function captureCsp(): string {
    const headers: Record<string, string> = {};
    const req = {
      headers: {},
      protocol: "https",
      get: () => "www.motorvault.shop",
      header: () => undefined,
    };
    const res = {
      setHeader: (k: string, v: string) => {
        headers[k] = v;
      },
    };
    applySecurityHeaders(
      req as unknown as express.Request,
      res as unknown as express.Response,
      (() => {}) as express.NextFunction
    );
    return headers["Content-Security-Policy"] ?? "";
  }

  it("allow-lists every Trusted Types policy the client creates", () => {
    const directive = captureCsp()
      .split(";")
      .map(d => d.trim())
      .find(d => d.startsWith("trusted-types"));

    expect(directive).toBeDefined();

    // TrustindexWidget.tsx calls trustedTypes.createPolicy("blootrue-loader").
    // A named policy missing from this list makes createPolicy throw
    // 'Policy "blootrue-loader" disallowed', which takes down the effect that
    // mounts the widget.
    expect(directive).toContain("blootrue-loader");
  });

  it("still requires trusted types for script sinks", () => {
    expect(captureCsp()).toContain("require-trusted-types-for 'script'");
  });
});
