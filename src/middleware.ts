import { defineMiddleware } from 'astro:middleware'
import { blogApiOrigin, blogRuntimeOrigin } from './server/origins'
import { loadPost, loadSite, loadTaxonomy, searchPosts } from './lib/blog-api'
import { buildRuntimeConfig, FALLBACK_SITE } from './server/site-config'
import { unlockCookieName } from './lib/format'
import { blogLocale, LOCALES } from './i18n'

const PASSTHROUGH = /^\/(?:_astro|_blog|api|favicon|robots\.txt|sitemap\.xml|rss\.xml|atom\.xml|llms)/

let taxonomyCache: { at: number; categories: Awaited<ReturnType<typeof loadTaxonomy>>; tags: Awaited<ReturnType<typeof loadTaxonomy>>; series: Awaited<ReturnType<typeof loadTaxonomy>> } | null = null

async function loadTaxonomies() {
  if (taxonomyCache && Date.now() - taxonomyCache.at < 30_000) return taxonomyCache
  const [categories, tags, series] = await Promise.all([loadTaxonomy('categories'), loadTaxonomy('tags'), loadTaxonomy('series')])
  taxonomyCache = { at: Date.now(), categories, tags, series }
  return taxonomyCache
}

async function mediaProxy(context: Parameters<Parameters<typeof defineMiddleware>[0]>[0]): Promise<Response> {
  const id = context.url.pathname.slice('/_blog/media/'.length)
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(id)) return new Response(null, { status: 404 })
  const origin = blogApiOrigin()
  if (!origin) return new Response(null, { status: 503 })
  const headers = new Headers({ 'x-inkstone-client': '1' })
  const key = import.meta.env.BLOG_PROXY_KEY
  if (key) headers.set('x-blog-proxy-key', key)
  let upstream: Response
  try {
    upstream = await fetch(`${origin}/api/blog/assets/${encodeURIComponent(id)}`, {
      headers,
      signal: AbortSignal.timeout(Number(import.meta.env.BLOG_API_TIMEOUT_MS ?? '8000')),
    })
  } catch {
    return new Response(null, { status: 502 })
  }
  if (!upstream.ok) return new Response(null, { status: upstream.status })
  const responseHeaders = new Headers()
  for (const name of ['content-type', 'content-length', 'etag', 'last-modified', 'cache-control']) {
    const value = upstream.headers.get(name)
    if (value) responseHeaders.set(name, value)
  }
  responseHeaders.set('x-content-type-options', 'nosniff')
  return new Response(upstream.body, { status: 200, headers: responseHeaders })
}

const RUNTIME_VERSION = /^inkstone-blog-v[0-9]+$/
const RUNTIME_FILE = /^[A-Za-z0-9._/-]+$/

/**
 * Serves the versioned reading runtime, and the published note body it re-renders, through this
 * origin. The browser never talks to the Inkstone host directly: the runtime is same-origin, its
 * `vendor/` requests land here too, and a private or protected note is answered by the API's own
 * status instead of being proxied around the access check.
 */
async function runtimeProxy(context: Parameters<Parameters<typeof defineMiddleware>[0]>[0]): Promise<Response> {
  const rest = context.url.pathname.slice('/_blog/runtime/'.length)
  if (!rest || !RUNTIME_FILE.test(rest)) return new Response(null, { status: 404 })
  if (rest.split('/').some((segment) => segment === '..' || segment === '.')) {
    return new Response(null, { status: 404 })
  }
  const [version, ...tail] = rest.split('/')
  if (!version || !RUNTIME_VERSION.test(version) || tail.length === 0) return new Response(null, { status: 404 })
  const origin = blogRuntimeOrigin()
  if (!origin) return new Response(null, { status: 503 })
  const upstreamPath = tail[0] === 'vendor'
    ? `/vendor/${tail.slice(1).join('/')}`
    : `/blog-runtime/${version}/${tail.join('/')}`
  let upstream: Response
  try {
    upstream = await fetch(`${origin}${upstreamPath}`, {
      headers: { 'x-inkstone-client': '1' },
      signal: AbortSignal.timeout(Number(import.meta.env.BLOG_API_TIMEOUT_MS ?? '8000')),
    })
  } catch {
    return new Response(null, { status: 502 })
  }
  if (!upstream.ok) return new Response(null, { status: upstream.status })
  const headers = new Headers()
  for (const name of ['content-type', 'content-length', 'etag', 'last-modified']) {
    const value = upstream.headers.get(name)
    if (value) headers.set(name, value)
  }
  headers.set('cache-control', 'public, max-age=31536000, immutable')
  headers.set('x-content-type-options', 'nosniff')
  return new Response(upstream.body, { status: 200, headers })
}

async function readingData(context: Parameters<Parameters<typeof defineMiddleware>[0]>[0]): Promise<Response> {
  const raw = context.url.pathname.slice('/_blog/post/'.length)
  if (!raw || raw.length > 240) return new Response(null, { status: 404 })
  let slug: string
  try {
    slug = decodeURIComponent(raw)
  } catch {
    return new Response(null, { status: 400 })
  }
  try {
    const post = await loadPost(slug, context.cookies.get(unlockCookieName(slug))?.value)
    if (!post.content || !post.render) return new Response(null, { status: 404 })
    return new Response(JSON.stringify({
      title: post.title,
      content: post.content,
      embeds: post.render.embeds ?? [],
      assets: post.render.assets ?? [],
      settings: post.render.settings,
      rendererVersion: post.render.rendererVersion,
      wikiLinks: post.render.wikiLinks,
    }), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        // The runtime re-renders this body over a snapshot that can already be the new revision;
        // a cached body would show the previous article under the new headings and TOC.
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      },
    })
  } catch {
    return new Response(null, { status: 404 })
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.url.pathname === '/_blog/search') {
    const q = (context.url.searchParams.get('q') ?? '').trim().slice(0, 120)
    if (!q) return Response.json({ items: [] }, { headers: { 'cache-control': 'no-store' } })
    try {
      const result = await searchPosts(q, 1, 8)
      return Response.json({
        items: result.items.map((item) => ({
          slug: item.slug,
          permalink: item.permalink ?? '',
          title: item.title,
          excerpt: item.excerpt || item.description || '',
          category: item.category,
          publishedAt: item.publishedAt,
        })),
      }, { headers: { 'cache-control': 'no-store' } })
    } catch (cause) {
      console.warn('[blog] instant search failed', cause)
      return Response.json({ error: 'search_failed' }, { status: 502 })
    }
  }
  if (context.url.pathname.startsWith('/_blog/runtime/')) return runtimeProxy(context)
  if (context.url.pathname.startsWith('/_blog/post/')) return readingData(context)
  if (context.url.pathname.startsWith('/_blog/media/')) return mediaProxy(context)

  if (!PASSTHROUGH.test(context.url.pathname)) {
    try {
      const site = await loadSite()
      const { categories, tags, series } = await loadTaxonomies()
      const blog = buildRuntimeConfig(site, categories.items, tags.items, series.items as never[])
      const requested = context.url.searchParams.get('lang') ?? context.cookies.get('blog-locale')?.value
      const selected = requested && (LOCALES as readonly string[]).includes(requested) ? blogLocale(requested) : null
      if (selected) {
        blog.site.site.locale = selected
        context.cookies.set('blog-locale', selected, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
      }
      context.locals.blog = blog
      context.locals.blogError = null
    } catch (cause) {
      context.locals.blog = buildRuntimeConfig(FALLBACK_SITE, [], [], [])
      context.locals.blogError = cause instanceof Error ? cause.message : String(cause)
    }
  }
  const response = await next()
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  return response
})
