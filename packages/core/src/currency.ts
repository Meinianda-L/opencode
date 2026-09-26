export * as Currency from "./currency"

// Approximate display exchange rates for the 7 most-traded currencies, units per 1 USD. Snapshot: 2026-08.
// Other currencies can be added via `display.exchangeRates`.
// These are display-only approximations and are never billing-authoritative.
export const ExchangeRates: Readonly<Record<string, number>> = {
  USD: 1,
  EUR: 0.86,
  GBP: 0.74,
  JPY: 147.5,
  CNY: 7.15,
  CAD: 1.37,
  AUD: 1.52,
}

export type Display = {
  readonly currency?: string
  readonly exchangeRates?: Readonly<Record<string, number>>
}

export function normalize(currency: string) {
  return currency.trim().toUpperCase()
}

export function rate(currency: string, overrides?: Readonly<Record<string, number>>) {
  const code = normalize(currency)
  const override = Object.entries(overrides ?? {}).find(([key]) => normalize(key) === code)
  // An explicit but invalid override disables conversion instead of falling back to the built-in rate.
  const value = override ? override[1] : ExchangeRates[code]
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value
  return undefined
}

export function convert(amount: number, from: string, to: string, rates?: Readonly<Record<string, number>>) {
  if (normalize(from) === normalize(to)) return amount
  const fromRate = rate(from, rates)
  const toRate = rate(to, rates)
  if (!fromRate || !toRate) return undefined
  return (amount / fromRate) * toRate
}

// Converts an amount tracked in `source` into the configured display currency.
// Falls back to the source amount and currency when no rate is known, so a number is never relabeled unconverted.
export function display(amount: number, source: string, options?: Display) {
  const target = options?.currency?.trim()
  const converted = target ? convert(amount, source, target, options?.exchangeRates) : undefined
  if (!target || converted === undefined) return { amount, currency: normalize(source) }
  return { amount: converted, currency: normalize(target) }
}

const formatters = new Map<string, Intl.NumberFormat>()

export function format(amount: number, currency: string, locale = "en-US") {
  const code = normalize(currency)
  // Intl.NumberFormat throws on codes that are not three letters.
  if (!/^[A-Z]{3}$/.test(code)) return `${amount.toFixed(2)} ${code}`
  const key = `${locale}\u0000${code}`
  const formatter = formatters.get(key) ?? new Intl.NumberFormat(locale, { style: "currency", currency: code })
  formatters.set(key, formatter)
  return formatter.format(amount)
}

export function formatDisplay(amount: number, source: string, options?: Display, locale?: string) {
  const result = display(amount, source, options)
  return format(result.amount, result.currency, locale)
}
