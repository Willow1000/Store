import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeTransaction, verifyTransaction } from '../paystack';

/**
 * Mock Paystack API responses for testing
 */
const mockPaystackSuccessResponse = {
  status: true,
  message: 'Authorization URL created',
  data: {
    authorization_url: 'https://checkout.paystack.com/test-reference',
    access_code: 'test-access-code',
    reference: 'TEST-REF-12345',
  },
};

const mockPaystackFailureResponse = {
  status: false,
  message: 'Invalid request',
};

const mockVerifySuccessResponse = {
  status: true,
  message: 'Verification successful',
  data: {
    reference: 'TEST-REF-12345',
    amount: 100000,
    status: 'success',
    paid: true,
    customer: {
      id: 123,
      email: 'customer@example.com',
    },
  },
};

const mockVerifyFailureResponse = {
  status: false,
  message: 'Verification failed',
  data: {
    status: 'failed',
    paid: false,
  },
};

describe('Paystack Payment Integration', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('initializeTransaction', () => {
    it('should successfully initialize a transaction with valid parameters', async () => {
      // Mock successful API response
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPaystackSuccessResponse),
        } as Response)
      );

      const result = await initializeTransaction(
        'customer@example.com',
        100000,
        'ORD-12345',
        { userId: 'user-123' }
      );

      expect(result).toBeDefined();
      expect(result?.reference).toBe('TEST-REF-12345');
      expect(result?.authorizationUrl).toBe('https://checkout.paystack.com/test-reference');
    });

    it('should return null when API request fails', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve(mockPaystackFailureResponse),
        } as Response)
      );

      const result = await initializeTransaction(
        'customer@example.com',
        100000,
        'ORD-12345',
        { userId: 'user-123' }
      );

      expect(result).toBeNull();
    });

    it('should handle network errors gracefully', async () => {
      global.fetch = vi.fn(() =>
        Promise.reject(new Error('Network error'))
      );

      const result = await initializeTransaction(
        'customer@example.com',
        100000,
        'ORD-12345',
        { userId: 'user-123' }
      );

      expect(result).toBeNull();
    });

    it('should include metadata in transaction', async () => {
      global.fetch = vi.fn((_url: string, init?: RequestInit) => {
        const body = JSON.parse(init?.body as string);
        expect(body.metadata).toEqual({ userId: 'user-123', orderId: 'ORD-12345' });
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPaystackSuccessResponse),
        } as Response);
      });

      const result = await initializeTransaction(
        'customer@example.com',
        100000,
        'ORD-12345',
        { userId: 'user-123' }
      );

      expect(result).toBeDefined();
    });
  });

  describe('verifyTransaction', () => {
    it('should successfully verify a completed transaction', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockVerifySuccessResponse),
        } as Response)
      );

      const result = await verifyTransaction('TEST-REF-12345');

      expect(result).toBeDefined();
      expect(result?.status).toBe('success');
      expect(result?.paid).toBe(true);
      expect(result?.amount).toBe(100000);
    });

    it('should return failed status for unsuccessful transaction', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockVerifyFailureResponse),
        } as Response)
      );

      const result = await verifyTransaction('TEST-REF-FAILED');

      expect(result).toBeDefined();
      expect(result?.paid).toBe(false);
    });

    it('should handle API errors during verification', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ message: 'Server error' }),
        } as Response)
      );

      const result = await verifyTransaction('TEST-REF-ERROR');

      expect(result).toBeNull();
    });

    it('should extract customer email from verification response', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ...mockVerifySuccessResponse,
            data: {
              ...mockVerifySuccessResponse.data,
              customer: {
                id: 456,
                email: 'verified@example.com',
              },
            },
          }),
        } as Response)
      );

      const result = await verifyTransaction('TEST-REF-12345');

      expect(result?.customer?.email).toBe('verified@example.com');
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle missing secret key gracefully', async () => {
      const originalKey = process.env.PAYSTACK_SECRET_KEY;
      delete process.env.PAYSTACK_SECRET_KEY;

      try {
        const result = await initializeTransaction(
          'customer@example.com',
          100000,
          'ORD-12345',
          {}
        );
        expect(result).toBeNull();
      } finally {
        if (originalKey) {
          process.env.PAYSTACK_SECRET_KEY = originalKey;
        }
      }
    });

    it('should handle malformed JSON response', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.reject(new Error('Invalid JSON')),
        } as Response)
      );

      const result = await initializeTransaction(
        'customer@example.com',
        100000,
        'ORD-12345',
        {}
      );

      expect(result).toBeNull();
    });

    it('should handle zero amount', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: 'Invalid amount' }),
        } as Response)
      );

      const result = await initializeTransaction(
        'customer@example.com',
        0,
        'ORD-12345',
        {}
      );

      expect(result).toBeNull();
    });
  });
});
