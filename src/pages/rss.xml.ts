import type { APIRoute } from 'astro'
import { loadFeeds, loadPost } from '../lib/blog-api'
import { cdata, escapeXml, feedFullText, feedPostHtml, latestUpdatedAt, postLink, publicPosts, siteOrigin } from '../lib/feed'

export const prerender = false

export const GET: APIRoute = async ({ url }) => {
  const feed = await loadFeeds().catch(() => null)
  if (!feed) return new Response('Blog feed unavailable', { status: 503 })
  const origin = siteOrigin(url, feed.site.site.url)
  const posts = publicPosts(feed.posts).slice(0, 50)
  const fullText = feedFullText(feed.site)
  const bodies = fullText
    ? await Promise.all(posts.map(async (post) => {
      const inline = feedPostHtml(post, origin)
      if (inline) return inline
      try {
        // The feed endpoint may not carry a body; the detail route is the
        // authoritative rendered snapshot. View counting stays off.
        const detail = await loadPost(post.slug, null, { countView: false })
        return feedPostHtml({ ...post, html: detail.render?.html ?? '' }, origin)
      } catch (cause) {
        console.warn('[blog] feed body unavailable', post.slug, cause)
        return ''
      }
    }))
    : []
  const items = posts.map((post, index) => {
    const link = postLink(origin, post.slug, post.permalink, feed.site.permalink.enable)
    const body = bodies[index] ?? ''
    return `<item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description>${escapeXml(post.excerpt || post.description)}</description>
      ${body ? `<content:encoded>${cdata(body)}</content:encoded>` : ''}
      ${post.publishedAt ? `<pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>` : ''}
      ${post.category ? `<category>${escapeXml(post.category)}</category>` : ''}
      ${post.tags.map((tag) => `<category>${escapeXml(tag)}</category>`).join('')}
    </item>`
  }).join('\n')
  const latest = latestUpdatedAt(posts)
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(feed.site.site.title)}</title>
    <link>${escapeXml(origin)}</link>
    <description>${escapeXml(feed.site.site.description)}</description>
    <language>${escapeXml(feed.site.site.locale)}</language>
    <lastBuildDate>${new Date(latest ?? Date.now()).toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`
  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=60' } })
}
