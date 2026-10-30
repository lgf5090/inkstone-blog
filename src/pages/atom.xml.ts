import type { APIRoute } from 'astro'
import { loadFeeds } from '../lib/blog-api'
import { escapeXml, postLink, siteOrigin } from '../lib/feed'

export const prerender = false

export const GET: APIRoute = async ({ url }) => {
  const feed = await loadFeeds().catch(() => null)
  if (!feed) return new Response('Blog feed unavailable', { status: 503 })
  const origin = siteOrigin(url, feed.site.site.url)
  const updated = feed.posts[0]?.updatedAt ? new Date(feed.posts[0].updatedAt).toISOString() : new Date().toISOString()
  const entries = feed.posts.slice(0, 50).map((post) => {
    const link = postLink(origin, post.slug)
    return `<entry>
      <title>${escapeXml(post.title)}</title>
      <link href="${escapeXml(link)}"/>
      <id>${escapeXml(link)}</id>
      <updated>${new Date(post.updatedAt).toISOString()}</updated>
      ${post.publishedAt ? `<published>${new Date(post.publishedAt).toISOString()}</published>` : ''}
      <summary>${escapeXml(post.excerpt || post.description)}</summary>
      ${post.category ? `<category term="${escapeXml(post.category)}"/>` : ''}
      ${post.tags.map((tag) => `<category term="${escapeXml(tag)}"/>`).join('')}
    </entry>`
  }).join('\n')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(feed.site.site.title)}</title>
  <link href="${escapeXml(origin)}"/>
  <link rel="self" href="${escapeXml(`${origin}/atom.xml`)}"/>
  <id>${escapeXml(origin)}</id>
  <updated>${updated}</updated>
  <subtitle>${escapeXml(feed.site.site.description)}</subtitle>
  ${entries}
</feed>`
  return new Response(xml, { headers: { 'content-type': 'application/atom+xml; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=60' } })
}
