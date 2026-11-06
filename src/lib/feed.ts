import type { BlogFeedPost, BlogPostSummary, BlogSitePublic } from './blog-types'
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

/**
 * The switch is persisted in the existing `blog_settings.display` JSON and
 * reaches the feed through `/site`. Default off: a feed that suddenly starts
 * shipping every article body is a surprise for subscribers.
 */
export function feedFullText(site: BlogSitePublic): boolean {
  return site.display?.feedFullText === true
}

/** `]]>` cannot appear inside a CDATA section; split it into two sections. */
export function cdata(value: string): string {
  return `<![CDATA[${value.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`
}

/**
 * A rendered note body can contain relative media and link targets. Feed
 * readers have no document base URL, so resolve them against the publication
 * origin before wrapping the HTML in CDATA.
 */
export function absolutizeHtml(html: string, origin: string): string {
  return html
    .replace(/(src|href)="(\/[^"]*)"/g, (_match, attribute: string, path: string) => `${attribute}="${origin}${path}"`)
    .replace(/(src|href)='(\/[^']*)'/g, (_match, attribute: string, path: string) => `${attribute}='${origin}${path}'`)
}

/** XML 1.0 forbids most C0 control characters, including NUL and vertical tab. */
export function stripInvalidXmlChars(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
}

export function feedPostHtml(post: BlogFeedPost, origin: string): string {
  // `contentHtml`/`html` are the documented body fields; some projections call
  // the same rendered body `content`. Only treat that as HTML when it looks like
  // markup, so a Markdown source is left for the detail fallback instead of
  // being emitted unrendered.
  const rendered = post.contentHtml || post.html || (typeof post.content === 'string' && /^\s*</.test(post.content) ? post.content : '')
  return rendered ? absolutizeHtml(stripInvalidXmlChars(rendered), origin) : ''
}

export function latestUpdatedAt(posts: readonly BlogPostSummary[]): number | null {
  let latest: number | null = null
  for (const post of posts) {
    if (typeof post.updatedAt === 'number' && Number.isFinite(post.updatedAt) && (latest === null || post.updatedAt > latest)) latest = post.updatedAt
  }
  return latest
}

