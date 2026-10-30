import type { BlogCommentsResponse, BlogPage, BlogPostDetail, BlogPostSummary, BlogSitePublic } from './blog-types'

const ORIGIN = (import.meta.env.BLOG_API_ORIGIN ?? '').replace(/\/+$/, '')
const PROXY_KEY = import.meta.env.BLOG_PROXY_KEY ?? ''
const TIMEOUT_MS = Number(import.meta.env.BLOG_API_TIMEOUT_MS ?? '8000')

export class BlogApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
    this.name = 'BlogApiError'
  }
}

async function getJson<T>(path: string): Promise<T> {
  if (!ORIGIN) throw new BlogApiError(503, 'BLOG_API_ORIGIN is not configured')
  const response = await fetch(`${ORIGIN}/api/blog${path}`, {
    headers: PROXY_KEY ? { 'x-blog-proxy-key': PROXY_KEY } : {},
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new BlogApiError(response.status, await response.text().catch(() => response.statusText))
  }
  return (await response.json()) as T
}

export function loadSite(): Promise<BlogSitePublic> {
  return getJson<BlogSitePublic>('/site')
}

export function loadPosts(page = 1, limit = 20): Promise<BlogPage<BlogPostSummary>> {
  return getJson<BlogPage<BlogPostSummary>>(`/posts?page=${page}&limit=${limit}`)
}

export function loadPost(slug: string): Promise<BlogPostDetail> {
  return getJson<BlogPostDetail>(`/posts/${encodeURIComponent(slug)}`)
}

export function loadComments(slug: string): Promise<BlogCommentsResponse> {
  return getJson<BlogCommentsResponse>(`/posts/${encodeURIComponent(slug)}/comments`)
}
