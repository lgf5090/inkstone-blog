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

export function postUrl(slug: string, permalink?: string | null, enabled = false): string {
  if (enabled && permalink) {
    const path = permalink.trim().replace(/^\/+|\/+$/g, '')
    if (path && !path.includes('..')) return '/' + path.split('/').map(encodeURIComponent).join('/')
  }
  return `/posts/${encodeURIComponent(slug)}`
}

const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

export function safeUrl(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim()
  if (!raw) return null
  if (raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('\\')) return raw
  try {
    const parsed = new URL(raw)
    return SAFE_LINK_PROTOCOLS.has(parsed.protocol) ? raw : null
  } catch {
    return null
  }
}

export function safeRedirectTarget(value: string | null | undefined, origin: string): string | null {
  const raw = (value ?? '').trim()
  if (!raw) return null
  if (raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('\\')) return raw
  try {
    const target = new URL(raw, origin)
    return target.origin === origin ? `${target.pathname}${target.search}${target.hash}` : null
  } catch {
    return null
  }
}

export function unlockCookieName(slug: string): string {
  let hash = 2166136261
  for (let index = 0; index < slug.length; index++) {
    hash ^= slug.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `blog_unlock_${(hash >>> 0).toString(36)}`
}

export function albumUnlockCookieName(slug: string): string {
  return `album_${unlockCookieName(slug)}`
}

export function collectionLabel(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
