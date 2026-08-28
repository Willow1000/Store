import { describe, expect, it, vi } from "vitest";
import { createRateLimitMiddleware, isStaticAssetPath } from "./rateLimit";

function mockReqRes(overrides: Partial<{ method: string; path: string }> = {}) {
  const req: any = {
    method: overrides.method ?? "POST",
    path: overrides.path ?? "/api/trpc/foo",
    header: () => undefined,
    ip: "127.0.0.1",
    socket: { remoteAddress: "127.0.0.1" },
  };
  const headers: Record<string, string> = {};
  const res: any = {
    setHeader: (key: string, value: string) => {
      headers[key] = value;
    },
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    headers,
  };
  return { req, res };
}

describe("isStaticAssetPath", () => {
  it("matches common static asset extensions and known prefixes", () => {
    expect(isStaticAssetPath("/style.css")).toBe(true);
    expect(isStaticAssetPath("/assets/chunk.js")).toBe(true);
    expect(isStaticAssetPath("/images/logo.png")).toBe(true);
    expect(isStaticAssetPath("/api/trpc/foo")).toBe(false);
  });
});

describe("createRateLimitMiddleware", () => {
  it("allows requests under the limit and blocks once it's exceeded", () => {
    const middleware = createRateLimitMiddleware({
      windowMs: 60_000,
      max: 2,
      pathPrefix: ["/api/trpc"],
    });
    const next = vi.fn();

    for (let i = 0; i < 2; i++) {
      const { req, res } = mockReqRes();
      middleware(req, res, next);
    }
    expect(next).toHaveBeenCalledTimes(2);

    const { req, res } = mockReqRes();
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it("calls the isExempt hook and skips limiting when it returns true", () => {
    const middleware = createRateLimitMiddleware({
      windowMs: 60_000,
      max: 0,
      isExempt: req => req.path === "/feed.xml",
    });
    const next = vi.fn();
    const { req, res } = mockReqRes({ path: "/feed.xml" });

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("skips limiting for GET/HEAD requests when no pathPrefix is set", () => {
    const middleware = createRateLimitMiddleware({ windowMs: 60_000, max: 0 });
    const next = vi.fn();
    const { req, res } = mockReqRes({ method: "GET", path: "/anything" });

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
