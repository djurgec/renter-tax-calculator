import i18n from '../i18n'

const locale = () => (i18n.language === 'en' ? 'en-GB' : 'hr-HR')

export function eur(value: number | null | undefined, decimals?: number): string {
  if (value == null) return '–'
  const whole = decimals ?? (Number.isInteger(value) ? 0 : 2)
  return new Intl.NumberFormat(locale(), {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: whole,
    maximumFractionDigits: Math.max(whole, 2),
  }).format(value)
}

export function eurRange(min: number | null, max: number | null): string {
  if (min == null && max == null) return '–'
  if (min == null || max == null || min === max) return eur(min ?? max)
  return `${eur(min)} – ${eur(max)}`
}

export function num(value: number, decimals = 0): string {
  return new Intl.NumberFormat(locale(), { maximumFractionDigits: decimals }).format(value)
}

export function percent(value: number | null): string {
  if (value == null) return '–'
  return new Intl.NumberFormat(locale(), { style: 'percent', maximumFractionDigits: 1 }).format(
    value,
  )
}

export function date(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : new Intl.DateTimeFormat(locale(), { dateStyle: 'medium' }).format(d)
}

export function bytes(n: number): string {
  if (n > 1e6) return `${num(n / 1e6, 1)} MB`
  return `${num(n / 1e3, 0)} kB`
}
