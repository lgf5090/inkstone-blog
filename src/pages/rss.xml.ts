import type { APIRoute } from 'astro'
import { loadFeeds } from '../lib/blog-api'
import { escapeXml, postLink, siteOrigin } from '../lib/feed'

export const prerender = false

export const GET: APIRoute = async ({ url }) => {
  const feed = await loadFeeds().catch(() => null)
  if (!feed) return new Response('Blog feed unavailable', { status: 503 })
  const origin = siteOrigin(url, feed.site.site.url)
  const items = feed.posts.slice(0, 50).map((post) => {
    const link = postLink(origin, post.slug, post.permalink, feed.site.permalink.enable)
    return `<item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description>${escapeXml(post.excerpt || post.description)}</description>
      ${post.publishedAt ? `<pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>` : ''}
      ${post.category ? `<category>${escapeXml(post.category)}</category>` : ''}
      ${post.tags.map((tag) => `<category>${escapeXml(tag)}</category>`).join('')}
    </item>`
  }).join('\n')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(feed.site.site.title)}</title>
    <link>${escapeXml(origin)}</link>
    <description>${escapeXml(feed.site.site.description)}</description>
    <language>${escapeXml(feed.site.site.locale)}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`
  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=60' } })
}
