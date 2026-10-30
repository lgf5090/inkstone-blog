import { defineMiddleware } from 'astro:middleware'
import { loadSite, loadTaxonomy } from './lib/blog-api'
import { buildRuntimeConfig, FALLBACK_SITE } from './server/site-config'
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
  const origin = (import.meta.env.BLOG_API_ORIGIN ?? '').replace(/\/+$/, '')
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

export const onRequest = defineMiddleware(async (context, next) => {
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
