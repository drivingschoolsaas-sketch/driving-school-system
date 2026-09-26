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

export function getTodayRange(timezone: string): { todayStart: string; todayEnd: string } {
  const now = new Date();
  const localDateStr = now.toLocaleDateString('en-CA', { timeZone: timezone });
  const [year, month, day] = localDateStr.split('-').map(Number);
  const localMidnight = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const utcMidnight = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  const offsetMs = localMidnight.getTime() - utcMidnight.getTime();
  const todayStart = new Date(Date.UTC(year, month - 1, day) - offsetMs).toISOString();
  const todayEnd = new Date(new Date(todayStart).getTime() + 86400000).toISOString();
  return { todayStart, todayEnd };
}

export function getLocalDateStr(timezone: string): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: timezone });
}
