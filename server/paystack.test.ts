import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  initializeTransaction,
  verifyTransaction,
  buildPaystackCallbackUrl,
} from "./paystack";

/**
 * paystackRequest() reads the response body via response.text() and JSON.parses
 * it, so mocks must implement text(), not json().
 */
function mockFetchOnce(status: number, ok: boolean, body: unknown) {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok,
      status,
      statusText: ok ? "OK" : "Error",
      text: () => Promise.resolve(JSON.stringify(body)),
    } as unknown as Response)
  );
}

const mockInitializeSuccess = {
  status: true,
  message: "Authorization URL created",
  data: {
    authorization_url: "https://checkout.paystack.com/test-reference",
    access_code: "test-access-code",
    reference: "TEST-REF-12345",
  },
};

const mockVerifySuccess = {
  status: true,
  message: "Verification successful",
  data: {
    reference: "TEST-REF-12345",
    amount: 100000,
    currency: "USD",
    status: "success",
    domain: "test",
    metadata: { userId: "user-123" },
  },
};

describe("Paystack Payment Integration", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("initializeTransaction", () => {
    it("initializes a transaction with valid parameters", async () => {
      mockFetchOnce(200, true, mockInitializeSuccess);

      const result = await initializeTransaction({
        email: "customer@example.com",
        amount: 100000,
        reference: "ORD-12345",
        metadata: { userId: "user-123" },
      });

      expect(result.status).toBe(true);
      expect(result.data.reference).toBe("TEST-REF-12345");
      expect(result.data.authorization_url).toBe(
        "https://checkout.paystack.com/test-reference"
      );
    });

    it("sends email, amount, reference and metadata in the request body", async () => {
      mockFetchOnce(200, true, mockInitializeSuccess);

      await initializeTransaction({
        email: "customer@example.com",
        amount: 100000,
        reference: "ORD-12345",
        metadata: { userId: "user-123" },
      });

      const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const [url, init] = call;
      expect(url).toBe("https://api.paystack.co/transaction/initialize");
      const body = JSON.parse(init.body as string);
      expect(body.email).toBe("customer@example.com");
      expect(body.amount).toBe(100000);
      expect(body.reference).toBe("ORD-12345");
      expect(body.metadata).toEqual({ userId: "user-123" });
    });

    it("throws when email is missing", async () => {
      await expect(
        initializeTransaction({ email: "", amount: 100000 })
      ).rejects.toThrow("Initialize transaction requires email and amount");
    });

    it("throws when amount is missing", async () => {
      await expect(
        initializeTransaction({ email: "customer@example.com", amount: 0 })
      ).rejects.toThrow("Initialize transaction requires email and amount");
    });

    it("throws when the email has no @", async () => {
      await expect(
        initializeTransaction({ email: "not-an-email", amount: 100000 })
      ).rejects.toThrow("Invalid email address provided");
    });

    it("throws when the amount is negative", async () => {
      await expect(
        initializeTransaction({ email: "customer@example.com", amount: -5 })
      ).rejects.toThrow("Amount must be greater than zero");
    });

    it("throws a TRPCError when Paystack returns a non-OK response", async () => {
      mockFetchOnce(400, false, { status: false, message: "Invalid request" });

      await expect(
        initializeTransaction({ email: "customer@example.com", amount: 100000 })
      ).rejects.toMatchObject({
        message: "Invalid request",
      } satisfies Partial<TRPCError>);
    });

    it("throws a TRPCError when the response body is not valid JSON", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          statusText: "OK",
          text: () => Promise.resolve("not json"),
        } as unknown as Response)
      );

      await expect(
        initializeTransaction({ email: "customer@example.com", amount: 100000 })
      ).rejects.toThrow(/Invalid JSON response/);
    });
  });

  describe("verifyTransaction", () => {
    it("verifies a completed transaction", async () => {
      mockFetchOnce(200, true, mockVerifySuccess);

      const result = await verifyTransaction("TEST-REF-12345");

      expect(result.status).toBe(true);
      expect(result.data.status).toBe("success");
      expect(result.data.amount).toBe(100000);
      expect(result.data.reference).toBe("TEST-REF-12345");
    });

    it("requests the correctly encoded verify URL", async () => {
      mockFetchOnce(200, true, mockVerifySuccess);

      await verifyTransaction("ref with spaces");

      const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe(
        "https://api.paystack.co/transaction/verify/ref%20with%20spaces"
      );
    });

    it("throws when reference is empty", async () => {
      await expect(verifyTransaction("")).rejects.toThrow(
        "Reference is required to verify transaction"
      );
    });

    it("throws a TRPCError when the API reports an error", async () => {
      mockFetchOnce(500, false, { status: false, message: "Server error" });

      await expect(verifyTransaction("TEST-REF-ERROR")).rejects.toMatchObject({
        message: "Server error",
      } satisfies Partial<TRPCError>);
    });
  });

  describe("buildPaystackCallbackUrl", () => {
    it("appends /payment/callback to the origin", () => {
      expect(buildPaystackCallbackUrl("https://motorvault.shop")).toBe(
        "https://motorvault.shop/payment/callback"
      );
    });

    it("strips a trailing slash from the origin", () => {
      expect(buildPaystackCallbackUrl("https://motorvault.shop/")).toBe(
        "https://motorvault.shop/payment/callback"
      );
    });

    it("returns undefined when no origin is given", () => {
      expect(buildPaystackCallbackUrl(null)).toBeUndefined();
      expect(buildPaystackCallbackUrl(undefined)).toBeUndefined();
    });
  });
});
