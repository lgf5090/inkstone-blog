export function formatDate(value: number | null | undefined, locale: string, timeZone: string, style: 'short' | 'medium' | 'long' = 'medium'): string {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: style === 'long' ? 'long' : style === 'short' ? 'short' : 'medium',
      timeZone: timeZone || undefined,
    }).format(new Date(value))
  } catch {
    return new Date(value).toISOString().slice(0, 10)
  }
}

export function formatDateTime(value: number | null | undefined, locale: string, timeZone: string): string {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timeZone || undefined,
    }).format(new Date(value))
  } catch {
    return new Date(value).toISOString()
  }
}

export function formatMonth(month: string, locale: string): string {
  const value = Number(month)
  if (!Number.isFinite(value) || value < 1 || value > 12) return month
  try {
    return new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2024, value - 1, 1))
  } catch {
    return month
  }
}

export function postUrl(slug: string): string {
  return `/posts/${encodeURIComponent(slug)}`
}

export function collectionLabel(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
