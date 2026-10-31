import type { APIRoute } from 'astro'
import { blogApiOrigin, blogApiTimeoutMs, blogProxyKey } from '../../../server/origins'
import { unlockCookieName } from '../../../lib/format'

export const prerender = false

const ALLOWED = /^posts\/[^/]+\/comments$|^friends\/apply$|^friends\/icon$|^friends\/icon-upload$|^friends\/qr$/

async function proxy(context: Parameters<APIRoute>[0]): Promise<Response> {
  const { params, request, cookies } = context
  const path = params.path ?? ''
  if (!ALLOWED.test(path)) return Response.json({ error: 'not_found' }, { status: 404 })
  const origin = blogApiOrigin()
  if (!origin) return Response.json({ error: 'blog_api_not_configured' }, { status: 503 })
  const headers = new Headers()
  const key = blogProxyKey()
  if (key) headers.set('x-blog-proxy-key', key)
  headers.set('x-inkstone-client', '1')
  const contentType = request.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)
  const accept = request.headers.get('accept')
  if (accept) headers.set('accept', accept)
  const slugMatch = /^posts\/([^/]+)\/comments$/.exec(path)
  if (slugMatch) {
    let postSlug = slugMatch[1]!
    try {
      postSlug = decodeURIComponent(postSlug)
    } catch {
      return Response.json({ error: 'not_found' }, { status: 404 })
    }
    const token = cookies.get(unlockCookieName(postSlug))?.value
    if (token) headers.set('x-blog-unlock', token)
  }
  try {
    const upstream = await fetch(`${origin}/api/blog/${path}${context.url.search}`, {
      method: request.method,
      headers,
      // Multipart uploads must keep their bytes: reading the body as text corrupts image data.
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
      signal: AbortSignal.timeout(blogApiTimeoutMs()),
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
