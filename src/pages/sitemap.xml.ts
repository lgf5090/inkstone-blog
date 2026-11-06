import type { APIRoute } from 'astro'
import { loadCollection, loadFeeds, loadPages, loadTaxonomy } from '../lib/blog-api'
import { escapeXml, latestUpdatedAt, publicPosts, siteOrigin } from '../lib/feed'
import { postUrl } from '../lib/format'
import type { BlogPostSummary, BlogSitePublic, SeriesItem, TaxonomyItem } from '../lib/blog-types'

export const prerender = false

function pageSizeOf(site: BlogSitePublic): number {
  const raw = site.display?.postListPageSize
  const value = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN
  return Number.isFinite(value) ? Math.min(50, Math.max(1, Math.trunc(value))) : 10
}

function maxUpdated(posts: readonly BlogPostSummary[]): number | undefined {
  return latestUpdatedAt(posts) ?? undefined
}

export const GET: APIRoute = async ({ url }) => {
  const [feed, pages, albums, categories, tags, series] = await Promise.all([
    loadFeeds().catch(() => null),
    loadPages().catch(() => ({ items: [] })),
    loadCollection('albums').catch(() => ({ items: [] })),
    loadTaxonomy('categories').catch(() => ({ items: [] })),
    loadTaxonomy('tags').catch(() => ({ items: [] })),
    loadTaxonomy('series').catch(() => ({ items: [] })),
  ])
  if (!feed) return new Response('Sitemap unavailable', { status: 503 })
  const origin = siteOrigin(url, feed.site.site.url)
  const posts = publicPosts(feed.posts)
  const pageSize = pageSizeOf(feed.site)
  const latestPost = maxUpdated(posts)
  const entries: { loc: string; lastmod?: number }[] = []
  const add = (path: string, lastmod?: number) => entries.push({ loc: `${origin}${path}`, lastmod })

  // `/about` is a 302 to `/pages/about`; the sitemap lists the canonical page only.
  const staticPaths = ['/', '/archive', '/categories', '/tags', '/series', '/moments', '/albums', '/friends', '/projects', '/skills', '/devices', '/games', '/anime', '/timeline', '/compass']
  for (const path of staticPaths) add(path, latestPost)
  for (const page of pages.items) {
    add(`/pages/${encodeURIComponent(page.slug)}`, page.updatedAt)
  }
  for (const album of albums.items) add(`/albums/${encodeURIComponent(album.slug)}`, album.updatedAt)

  // Home pagination: only real pages, not the redirecting /page/1.
  const homePages = Math.ceil(posts.length / pageSize)
  for (let page = 2; page <= homePages; page++) {
    add(`/page/${page}`, maxUpdated(posts.slice((page - 1) * pageSize, page * pageSize)))
  }

  const taxonomyGroups: {
    base: string
    items: (TaxonomyItem | SeriesItem)[]
    match: (post: BlogPostSummary) => string[]
  }[] = [
    { base: '/categories', items: categories.items as TaxonomyItem[], match: (post) => post.category ? [post.category] : [] },
    { base: '/tags', items: tags.items as TaxonomyItem[], match: (post) => post.tags },
    { base: '/series', items: series.items as SeriesItem[], match: (post) => post.series ? [post.series] : [] },
  ]

  for (const group of taxonomyGroups) {
    const groupPosts = posts.filter((post) => group.match(post).some((name) => group.items.some((item) => item.name === name)))
    add(group.base, maxUpdated(groupPosts))
    for (const item of group.items) {
      if (!item.slug) continue
      const related = posts.filter((post) => group.match(post).includes(item.name))
      // A taxonomy that only holds encrypted posts is just as private as the
      // posts; neither its page nor its pagination belongs in the sitemap.
      if (related.length === 0) continue
      const path = `${group.base}/${encodeURIComponent(item.slug)}`
      add(path, maxUpdated(related))
      const pagesCount = Math.ceil(related.length / pageSize)
      for (let page = 2; page <= pagesCount; page++) {
        add(`${path}?page=${page}`, maxUpdated(related.slice((page - 1) * pageSize, page * pageSize)))
      }
    }
  }

  for (const post of posts) {
    add(postUrl(post.slug, post.permalink, feed.site.permalink.enable), post.updatedAt)
  }

  // One URL per location; a later entry can only raise the lastmod.
  const merged = new Map<string, number | undefined>()
  for (const entry of entries) {
    const previous = merged.get(entry.loc)
    merged.set(entry.loc, entry.lastmod !== undefined && previous !== undefined
      ? Math.max(previous, entry.lastmod)
      : entry.lastmod ?? previous)
  }
  const body = [...merged.entries()].map(([loc, lastmod]) => `<url><loc>${escapeXml(loc)}</loc>${lastmod !== undefined ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ''}</url>`).join('\n')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=60' } })
}
