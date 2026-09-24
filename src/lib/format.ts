const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  AUD: '$',
  GBP: '£',
  EUR: '€',
  CAD: '$',
  NZD: '$',
  INR: '₹',
  BDT: '৳',
  JPY: '¥',
  CNY: '¥',
  KRW: '₩',
  ZAR: 'R',
  AED: 'AED ',
  SGD: '$',
  MYR: 'RM ',
  PHP: '₱',
  THB: '฿',
  IDR: 'Rp ',
  VND: '₫',
  PKR: 'Rs ',
  LKR: 'Rs ',
};

export function formatPrice(cents: number, currency?: string | null): string {
  const symbol = CURRENCY_SYMBOLS[currency ?? 'USD'] ?? '$';
  return `${symbol}${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}
