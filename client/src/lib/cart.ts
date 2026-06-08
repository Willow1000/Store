export interface LocalCartItem {
  productId?: string;
  productIndex: number;
  title: string;
  price: string;
  image: string;
  quantity: number;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeItem(raw: unknown): LocalCartItem | null {
  if (!raw || typeof raw !== 'object') return null;

  const item = raw as Record<string, unknown>;
  const productId = typeof item.productId === 'string' ? item.productId : '';
  const productIndex = toNumber(item.productIndex, -1);
  if (!productId && productIndex < 0) return null;

  return {
    productId: productId || undefined,
    productIndex,
    title: String(item.title ?? ''),
    price: String(item.price ?? '0'),
    image: String(item.image ?? ''),
    quantity: Math.max(1, toNumber(item.quantity, 1)),
  };
}

export function normalizeCartItems(payload: unknown): LocalCartItem[] {
  if (Array.isArray(payload)) {
    return payload.map(normalizeItem).filter((x): x is LocalCartItem => x !== null);
  }

  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;

    if (Array.isArray(obj.items)) {
      return obj.items.map(normalizeItem).filter((x): x is LocalCartItem => x !== null);
    }

    return Object.values(obj)
      .map(normalizeItem)
      .filter((x): x is LocalCartItem => x !== null);
  }

  return [];
}

export function readCartFromStorage(raw: string | null): LocalCartItem[] {
  if (!raw) return [];
  try {
    return normalizeCartItems(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function writeCartToStorage(items: LocalCartItem[]) {
  try {
    localStorage.setItem('cart', JSON.stringify(items));
    window.dispatchEvent(new Event('cartUpdated'));
  } catch (e) {
    // ignore
  }
}

export function addToLocalCart(item: LocalCartItem) {
  try {
    const raw = localStorage.getItem('cart');
    const existing = readCartFromStorage(raw);

    // Merge: additive quantities if same productId/productIndex
    let merged = false;
    const next = existing.map((it) => {
      if (item.productId && it.productId && it.productId === item.productId) {
        merged = true;
        return { ...it, quantity: Math.max(1, it.quantity + item.quantity) };
      }
      if (!item.productId && it.productIndex === item.productIndex) {
        merged = true;
        return { ...it, quantity: Math.max(1, it.quantity + item.quantity) };
      }
      return it;
    });

    if (!merged) next.push(item);
    writeCartToStorage(next);
    return true;
  } catch (e) {
    console.error('addToLocalCart error', e);
    return false;
  }
}

export function readWishlistFromStorage(): string[] {
  try {
    const raw = localStorage.getItem('wishlist');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === 'string');
  } catch (e) {}
  return [];
}

export function writeWishlistToStorage(items: string[]) {
  try {
    localStorage.setItem('wishlist', JSON.stringify(items));
    window.dispatchEvent(new Event('wishlistUpdated'));
  } catch (e) {}
}