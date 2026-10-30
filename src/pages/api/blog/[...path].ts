import type { APIRoute } from 'astro'

export const prerender = false

const ALLOWED = /^posts\/[^/]+\/comments$/

async function proxy({ params, request }: { params: Record<string, string | undefined>; request: Request }): Promise<Response> {
  const path = params.path ?? ''
  if (!ALLOWED.test(path)) return Response.json({ error: 'not_found' }, { status: 404 })
  const origin = (import.meta.env.BLOG_API_ORIGIN ?? '').replace(/\/+$/, '')
  if (!origin) return Response.json({ error: 'blog_api_not_configured' }, { status: 503 })
  const headers = new Headers()
  const key = import.meta.env.BLOG_PROXY_KEY
  if (key) headers.set('x-blog-proxy-key', key)
  headers.set('x-inkstone-client', '1')
  const contentType = request.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)
  const accept = request.headers.get('accept')
  if (accept) headers.set('accept', accept)
  try {
    const upstream = await fetch(`${origin}/api/blog/${path}`, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text(),
      signal: AbortSignal.timeout(Number(import.meta.env.BLOG_API_TIMEOUT_MS ?? '8000')),
    })
    const responseHeaders = new Headers()
    const type = upstream.headers.get('content-type')
    if (type) responseHeaders.set('content-type', type)
    responseHeaders.set('cache-control', 'no-store')
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders })
  } catch {
    return Response.json({ error: 'blog_api_unreachable' }, { status: 502 })
  }
}

export const GET: APIRoute = (context) => proxy(context)
export const POST: APIRoute = (context) => proxy(context)
