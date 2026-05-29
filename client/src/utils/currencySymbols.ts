// Map currency codes to symbols (major currencies)
export const currencySymbols: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  INR: '₹',
  RUB: '₽',
  NGN: '₦',
  CAD: '$',
  AUD: '$',
  NZD: '$',
  SGD: '$',
  HKD: '$',
  ZAR: 'R',
  BRL: 'R$',
  MXN: '$',
  CHF: 'CHF',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  PLN: 'zł',
  HUF: 'Ft',
  CZK: 'Kč',
  TRY: '₺',
  KRW: '₩',
  THB: '฿',
  IDR: 'Rp',
  PHP: '₱',
  VND: '₫',
  MYR: 'RM',
  ILS: '₪',
  AED: 'د.إ',
  SAR: '﷼',
  ARS: '$',
  COP: '$',
  CLP: '$',
  PYG: '₲',
  BGN: 'лв',
  RON: 'lei',
  BDT: '৳',
  // Fallbacks for common locales
  GBP_ALT: '£',
};

export function getCurrencySymbol(code: string): string {
  const sym = currencySymbols[code];
  if (!sym) return code;
  // If symbol is '$' but the code is not USD, prefer returning the ticker (e.g., AUD, CAD)
  if (sym === '$' && code !== 'USD') return code;
  return sym;
}
