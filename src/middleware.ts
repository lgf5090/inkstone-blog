import { defineMiddleware } from 'astro:middleware'
import { env as workerEnv } from 'cloudflare:workers'
import { blogApiOrigin, blogApiTimeoutMs, blogProxyKey, blogRuntimeOrigin } from './server/origins'
import { loadPost, loadSite, loadTaxonomy, searchPosts } from './lib/blog-api'
import { buildRuntimeConfig, FALLBACK_SITE } from './server/site-config'
import { CSP_REPORT_ONLY, contentSecurityPolicy, inlineScriptHashes } from './server/csp'
import { unlockCookieName } from './lib/format'
import { blogLocale, LOCALE_PREF_COOKIE, LOCALES, t } from './i18n'

const PASSTHROUGH = /^\/(?:_astro|_blog|api|favicon|robots\.txt|sitemap\.xml|rss\.xml|atom\.xml|llms)/

let taxonomyCache: { at: number; categories: Awaited<ReturnType<typeof loadTaxonomy>>; tags: Awaited<ReturnType<typeof loadTaxonomy>>; series: Awaited<ReturnType<typeof loadTaxonomy>> } | null = null

async function loadTaxonomies() {
  if (taxonomyCache && Date.now() - taxonomyCache.at < 30_000) return taxonomyCache
  const [categories, tags, series] = await Promise.all([loadTaxonomy('categories'), loadTaxonomy('tags'), loadTaxonomy('series')])
  taxonomyCache = { at: Date.now(), categories, tags, series }
  return taxonomyCache
}

type SearchLimiter = { limit: (options: { key: string }) => Promise<{ success: boolean }> }
const localSearchWindows = new Map<string, { count: number; reset: number }>()

function localSearchAllowed(key: string): boolean {
  const now = Date.now()
  if (localSearchWindows.size > 5000) localSearchWindows.clear()
  const entry = localSearchWindows.get(key)
  if (!entry || entry.reset <= now) {
    localSearchWindows.set(key, { count: 1, reset: now + 60_000 })
    return true
  }
  entry.count += 1
  return entry.count <= 60
}

async function searchAllowed(ip: string): Promise<boolean> {
  const key = `search:${ip}`
  const limiter = (workerEnv as unknown as { SEARCH_RATE_LIMITER?: SearchLimiter }).SEARCH_RATE_LIMITER
  if (limiter) {
    try {
      return (await limiter.limit({ key })).success
    } catch (cause) {
      console.warn('[blog] search rate limiter failed; using isolate fallback', cause)
    }
  }
  return localSearchAllowed(key)
}

function searchRateLimited(pathname: string): Response {
  const headers = new Headers({
    'cache-control': 'no-store',
    'retry-after': '60',
    'x-content-type-options': 'nosniff',
  })
  if (pathname === '/_blog/search') return Response.json({ error: 'rate_limited' }, { status: 429, headers })
  headers.set('content-type', 'text/html; charset=utf-8')
  headers.set('x-frame-options', 'SAMEORIGIN')
  headers.set('referrer-policy', 'strict-origin-when-cross-origin')
  return new Response(
    '<!doctype html><html lang="en"><meta charset="utf-8"><title>Too many searches</title><p>Too many searches. Please try again in a minute.</p><p><a href="/">Home</a></p>',
    { status: 429, headers },
  )
}

async function mediaProxy(context: Parameters<Parameters<typeof defineMiddleware>[0]>[0]): Promise<Response> {
  const id = context.url.pathname.slice('/_blog/media/'.length)
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(id)) return new Response(null, { status: 404 })
  const origin = blogApiOrigin()
  if (!origin) return new Response(null, { status: 503 })
  const headers = new Headers({ 'x-inkstone-client': '1' })
  const key = blogProxyKey()
  if (key) headers.set('x-blog-proxy-key', key)
  let upstream: Response
  try {
    upstream = await fetch(`${origin}/api/blog/assets/${encodeURIComponent(id)}`, {
      headers,
      signal: AbortSignal.timeout(blogApiTimeoutMs()),
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

/**
 * Streams one owner-library track or cover through the blog origin.
 *
 * The browser only holds a short-lived HMAC token issued by `/site`; the R2 key stays inside the
 * worker. Range requests are forwarded so seeking and partial audio loads behave like the music app.
 */
async function musicProxy(context: Parameters<Parameters<typeof defineMiddleware>[0]>[0]): Promise<Response> {
  const rest = context.url.pathname.slice('/_blog/music/'.length)
  if (!/^(?:audio|cover)\/[A-Za-z0-9_-]{1,64}$/.test(rest)) return new Response(null, { status: 404 })
  const origin = blogApiOrigin()
  if (!origin) return new Response(null, { status: 503 })
  const headers = new Headers({ 'x-inkstone-client': '1' })
  const key = blogProxyKey()
  if (key) headers.set('x-blog-proxy-key', key)
  const range = context.request.headers.get('range')
  if (range) headers.set('range', range)
  const ifNoneMatch = context.request.headers.get('if-none-match')
  if (ifNoneMatch) headers.set('if-none-match', ifNoneMatch)
  let upstream: Response
  try {
    upstream = await fetch(`${origin}/api/blog/music/${rest}${context.url.search}`, {
      headers,
      signal: AbortSignal.timeout(blogApiTimeoutMs()),
    })
  } catch {
    return new Response(null, { status: 502 })
  }
  const responseHeaders = new Headers()
  for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified', 'cache-control']) {
    const value = upstream.headers.get(name)
    if (value) responseHeaders.set(name, value)
  }
  responseHeaders.set('x-content-type-options', 'nosniff')
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders })
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
      signal: AbortSignal.timeout(blogApiTimeoutMs()),
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
  if (context.url.pathname === '/search' || context.url.pathname === '/_blog/search') {
    const ip = context.request.headers.get('cf-connecting-ip') ?? 'local'
    if (!(await searchAllowed(ip))) return searchRateLimited(context.url.pathname)
  }
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
  if (context.url.pathname.startsWith('/_blog/music/')) return musicProxy(context)

  if (!PASSTHROUGH.test(context.url.pathname)) {
    try {
      const [site, taxonomies] = await Promise.all([loadSite(), loadTaxonomies()])
      const { categories, tags, series } = taxonomies
      // `?lang=` is a one-request override; the appearance panel's cookie is the only persistent
      // preference. Neither branch writes to `loadSite()`'s isolate-wide cache below.
      const requested = context.url.searchParams.get('lang')
      const requestedLocale = requested && (LOCALES as readonly string[]).includes(requested) ? blogLocale(requested) : null
      const preference = context.cookies.get(LOCALE_PREF_COOKIE)?.value
      const preferredLocale = preference && (LOCALES as readonly string[]).includes(preference) ? blogLocale(preference) : null
      const selected = requestedLocale ?? preferredLocale
      // `loadSite()` hands back the isolate-wide cached object for 30s, so writing `locale` on it
      // leaked one visitor's `?lang=` into every later request. Apply the override to a copy that
      // only this request (and the config built from it) can see.
      const requestSite = selected ? { ...site, site: { ...site.site, locale: selected } } : site
      const blog = buildRuntimeConfig(requestSite, categories.items, tags.items, series.items as never[])
      context.locals.blog = blog
      context.locals.blogError = null
    } catch (cause) {
      console.warn('[blog] site bootstrap failed', cause)
      context.locals.blog = buildRuntimeConfig(FALLBACK_SITE, [], [], [])
      context.locals.blogError = t(blogLocale(undefined), 'common.loadError')
    }
  }
  const response = await next()
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  const contentType = response.headers.get('content-type') ?? ''
  const skipStatus = response.status === 204 || response.status === 304 || (response.status >= 300 && response.status < 400)
  if (!import.meta.env.DEV && context.request.method !== 'HEAD' && contentType.includes('text/html') && !skipStatus) {
    const html = await response.text()
    const headers = new Headers(response.headers)
    headers.delete('content-length')
    headers.delete('content-encoding')
    headers.set(CSP_REPORT_ONLY ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy', contentSecurityPolicy(await inlineScriptHashes(html)))
    return new Response(html, { status: response.status, headers })
  }
  return response
})
