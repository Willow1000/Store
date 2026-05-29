// Utility to fetch currency conversion rates from freecurrencyapi.com

export interface CurrencyRates {
  data: Record<string, number>;
}

export async function fetchCurrencyRate(target: string, base = 'USD'): Promise<number | null> {
  const apiKey = import.meta.env.VITE_CURRENCY_API_KEY || '';
  // Try freecurrencyapi.com first (if key provided), otherwise fall back to exchangerate.host
  if (apiKey) {
    const url = `https://api.freecurrencyapi.com/v1/latest?apikey=${apiKey}&currencies=${target}&base_currency=${base}`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const json: CurrencyRates = await res.json();
        if (json && json.data && typeof json.data[target] === 'number') return json.data[target];
      }
    } catch (e) {
      // ignore and fall back
    }
  }

  // Fallback: exchangerate.host (no API key required)
  try {
    const fallbackUrl = `https://api.exchangerate.host/latest?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(target)}`;
    const res2 = await fetch(fallbackUrl);
    if (res2.ok) {
      const j = await res2.json();
      // Response shape: { rates: { EUR: 0.92 }, base: 'USD' }
      if (j && j.rates && typeof j.rates[target] === 'number') return j.rates[target];
    }
  } catch (e) {
    // ignore
  }

  return null;
}
