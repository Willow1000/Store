import { describe, expect, it } from 'vitest';
import { isMetaCheckoutRequest, parseMetaCheckoutParams, parseMetaProductsParam } from '../client/src/lib/metaCheckout';

describe('meta checkout query parsing', () => {
  it('decodes encoded products and tracking parameters', () => {
    const params = parseMetaCheckoutParams(
      'products=12345%3A3%2C23456%3A1&coupon=SUMMERSALE20&fbclid=1234567890abcdef&cart_origin=instagram&utm_source=facebook&utm_medium=paid&utm_campaign=2025-spring-sale&utm_content=carousel'
    );

    expect(params.products).toBe('12345:3,23456:1');
    expect(params.coupon).toBe('SUMMERSALE20');
    expect(params.fbclid).toBe('1234567890abcdef');
    expect(params.cart_origin).toBe('instagram');
    expect(params.utm_source).toBe('facebook');
    expect(params.utm_medium).toBe('paid');
    expect(params.utm_campaign).toBe('2025-spring-sale');
    expect(params.utm_content).toBe('carousel');
    expect(parseMetaProductsParam(params.products)).toEqual([
      { productId: '12345', quantity: 3 },
      { productId: '23456', quantity: 1 },
    ]);
  });

  it('recognizes Meta checkout requests from the cart origin and checkout meta route', () => {
    expect(isMetaCheckoutRequest(new URLSearchParams('cart_origin=meta_shops'), '/checkout')).toBe(true);
    expect(isMetaCheckoutRequest(new URLSearchParams('coupon=SUMMERSALE20'), '/checkout/meta')).toBe(true);
    expect(isMetaCheckoutRequest(new URLSearchParams('fbclid=12345'), '/checkout')).toBe(false);
  });
});
