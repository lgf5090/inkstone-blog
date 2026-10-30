import type { APIRoute } from 'astro'
import { loadFeeds } from '../lib/blog-api'
import { escapeXml, postLink, siteOrigin } from '../lib/feed'

export const prerender = false

export const GET: APIRoute = async ({ url }) => {
  const feed = await loadFeeds().catch(() => null)
  if (!feed) return new Response('Sitemap unavailable', { status: 503 })
  const origin = siteOrigin(url, feed.site.site.url)
  const staticPaths = ['/', '/archive', '/categories', '/tags', '/series', '/moments', '/albums', '/friends', '/projects', '/skills', '/devices', '/games', '/anime', '/timeline', '/compass', '/about']
  const entries = [
    ...staticPaths.map((path) => `<url><loc>${escapeXml(`${origin}${path}`)}</loc></url>`),
    ...feed.posts.map((post) => `<url><loc>${escapeXml(postLink(origin, post.slug))}</loc><lastmod>${new Date(post.updatedAt).toISOString()}</lastmod></url>`),
  ].join('\n')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=60' } })
}
