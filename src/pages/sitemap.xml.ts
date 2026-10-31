import type { APIRoute } from 'astro'
import { loadCollection, loadFeeds, loadPages } from '../lib/blog-api'
import { escapeXml, postLink, siteOrigin } from '../lib/feed'

export const prerender = false

export const GET: APIRoute = async ({ url }) => {
  const [feed, pages, albums] = await Promise.all([
    loadFeeds().catch(() => null),
    loadPages().catch(() => ({ items: [] })),
    loadCollection('albums').catch(() => ({ items: [] })),
  ])
  if (!feed) return new Response('Sitemap unavailable', { status: 503 })
  const origin = siteOrigin(url, feed.site.site.url)
  const staticPaths = ['/', '/archive', '/categories', '/tags', '/series', '/moments', '/albums', '/friends', '/projects', '/skills', '/devices', '/games', '/anime', '/timeline', '/compass', '/about']
  const pagePaths = pages.items.map((page) => (page.kind === 'about' ? '/about' : `/pages/${encodeURIComponent(page.slug)}`))
  const albumPaths = albums.items.map((album) => `/albums/${encodeURIComponent(album.slug)}`)
  const entries = [
    ...[...new Set([...staticPaths, ...pagePaths, ...albumPaths])].map((path) => `<url><loc>${escapeXml(`${origin}${path}`)}</loc></url>`),
    ...feed.posts.map((post) => `<url><loc>${escapeXml(postLink(origin, post.slug, post.permalink, feed.site.permalink.enable))}</loc><lastmod>${new Date(post.updatedAt).toISOString()}</lastmod></url>`),
  ].join('\n')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=60' } })
}
