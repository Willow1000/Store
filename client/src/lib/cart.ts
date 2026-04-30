export interface LocalCartItem {
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
  const productIndex = toNumber(item.productIndex, -1);
  if (productIndex < 0) return null;

  return {
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