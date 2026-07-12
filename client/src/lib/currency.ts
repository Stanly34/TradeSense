const CURRENCY_MAP: Record<string, { symbol: string; code: string }> = {
  INR: { symbol: '₹', code: 'INR' },
  USD: { symbol: '$', code: 'USD' },
  EUR: { symbol: '€', code: 'EUR' },
  GBP: { symbol: '£', code: 'GBP' },
  JPY: { symbol: '¥', code: 'JPY' },
  AUD: { symbol: 'A$', code: 'AUD' },
  CAD: { symbol: 'C$', code: 'CAD' },
  CHF: { symbol: 'Fr', code: 'CHF' },
  SGD: { symbol: 'S$', code: 'SGD' },
  AED: { symbol: 'د.إ', code: 'AED' },
}

export function getCurrencySymbol(code: string): string {
  return CURRENCY_MAP[code]?.symbol || code
}

export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_MAP)

export function formatPrice(amount: number, currencyCode: string): string {
  const sym = getCurrencySymbol(currencyCode)
  return `${sym}${amount}`
}
