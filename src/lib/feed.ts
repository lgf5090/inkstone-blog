import { postUrl } from './format'

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function siteOrigin(requestUrl: URL, siteUrl: string): string {
  const configured = (import.meta.env.BLOG_SITE_URL ?? '').replace(/\/+$/, '')
  return configured || siteUrl.replace(/\/+$/, '') || requestUrl.origin
}

export function postLink(origin: string, slug: string, permalink?: string | null, enabled = false): string {
  return `${origin}${postUrl(slug, permalink, enabled)}`
}

