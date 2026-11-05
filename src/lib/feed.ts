import type { BlogPostSummary } from './blog-types'
import { postUrl } from './format'

/**
 * A protected article contributes neither a title nor a link to any public listing, feed or sitemap.
 * Unlocking is a per-article page grant, not a discovery grant, so the filter is applied for every
 * visitor rather than depending on a session.
 */
export function publicPosts(posts: readonly BlogPostSummary[]): BlogPostSummary[] {
  return posts.filter((post) => !post.encrypted)
}

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

