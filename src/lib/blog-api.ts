import { z } from 'zod'
import type {
  AdjacentPosts,
  BlogAlbumDetail,
  BlogArchiveYear,
  BlogCollectionItem,
  BlogCollectionKind,
  BlogCommentsResponse,
  BlogCompassShelf,
  BlogFeedData,
  BlogPage,
  BlogPageItem,
  BlogPostDetail,
  BlogPostSummary,
  BlogRedirectResult,
  BlogSearchResult,
  BlogSitePublic,
  SeriesItem,
  TaxonomyItem,
} from './blog-types'

const ORIGIN = (import.meta.env.BLOG_API_ORIGIN ?? '').replace(/\/+$/, '')
const PROXY_KEY = import.meta.env.BLOG_PROXY_KEY ?? ''
const TIMEOUT_MS = Number(import.meta.env.BLOG_API_TIMEOUT_MS ?? '8000')

export class BlogApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'BlogApiError'
  }
}

const siteSchema = z.object({
  site: z.object({
    title: z.string(),
    subtitle: z.string().default(''),
    description: z.string().default(''),
    url: z.string().default(''),
    locale: z.string().default('en'),
    timeZone: z.string().default('UTC'),
    themeColor: z.object({ hue: z.number(), style: z.string(), spec: z.string() }).default({ hue: 315, style: 'tonalSpot', spec: '2025' }),
  }).passthrough(),
  profile: z.object({
    name: z.string().default(''),
    bio: z.string().default(''),
    avatar: z.string().default(''),
    links: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
  }).passthrough().default({ name: '', bio: '', avatar: '', links: [] }),
  nav: z.array(z.object({
    label: z.string(),
    href: z.string(),
    children: z.array(z.object({ label: z.string(), href: z.string() })).optional(),
  })).default([]),
  sidebar: z.object({
    enable: z.boolean().default(true),
    arrangement: z.enum(['single', 'dual']).default('single'),
    side: z.enum(['left', 'right']).default('left'),
    widgets: z.array(z.string()).default([]),
  }).passthrough().default({ enable: true, arrangement: 'single', side: 'left', widgets: [] }),
  widgets: z.array(z.object({
    id: z.string(),
    type: z.string(),
    title: z.string().default(''),
    enabled: z.boolean().default(true),
    config: z.record(z.string(), z.unknown()).default({}),
  })).default([]),
  discussion: z.object({
    enabled: z.boolean().default(true),
    requireNameEmail: z.boolean().default(true),
    requireApproval: z.boolean().default(true),
    allowReplies: z.boolean().default(true),
    maxLength: z.number().default(4000),
    autoCloseDays: z.number().default(0),
  }).passthrough().default({ enabled: true, requireNameEmail: true, requireApproval: true, allowReplies: true, maxLength: 4000, autoCloseDays: 0 }),
  display: z.record(z.string(), z.unknown()).default({}),
  integrations: z.object({
    comments: z.string().default('none'),
    music: z.string().default('none'),
    umami: z.string().default('none'),
  }).passthrough().default({ comments: 'none', music: 'none', umami: 'none' }),
  counts: z.object({
    posts: z.number().default(0),
    categories: z.number().default(0),
    tags: z.number().default(0),
    series: z.number().default(0),
  }).passthrough().default({ posts: 0, categories: 0, tags: 0, series: 0 }),
}).passthrough()

function apiHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    ...(PROXY_KEY ? { 'x-blog-proxy-key': PROXY_KEY } : {}),
    'x-inkstone-client': '1',
    ...extra,
  }
}

async function failed(response: Response): Promise<BlogApiError> {
  let message = response.statusText
  let code: string | undefined
  let details: unknown
  try {
    const body = (await response.json()) as { error?: { message?: string; code?: string; details?: unknown } }
    message = body.error?.message ?? message
    code = body.error?.code
    details = body.error?.details
  } catch {
    message = await response.text().catch(() => message)
  }
  return new BlogApiError(response.status, message, code, details)
}

async function getJson<T>(
  path: string,
  query?: Record<string, string | number | boolean | undefined | null>,
  headers?: Record<string, string>,
): Promise<T> {
  if (!ORIGIN) throw new BlogApiError(503, 'BLOG_API_ORIGIN is not configured', 'blog_api_not_configured')
  const url = new URL(`${ORIGIN}/api/blog${path}`)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  }
  let response: Response
  try {
    response = await fetch(url, {
      headers: apiHeaders(headers),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (cause) {
    throw new BlogApiError(503, cause instanceof Error ? cause.message : String(cause), 'blog_api_unreachable')
  }
  if (!response.ok) throw await failed(response)
  return (await response.json()) as T
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  if (!ORIGIN) throw new BlogApiError(503, 'BLOG_API_ORIGIN is not configured', 'blog_api_not_configured')
  let response: Response
  try {
    response = await fetch(`${ORIGIN}/api/blog${path}`, {
      method: 'POST',
      headers: apiHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (cause) {
    throw new BlogApiError(503, cause instanceof Error ? cause.message : String(cause), 'blog_api_unreachable')
  }
  if (!response.ok) throw await failed(response)
  return (await response.json()) as T
}

let siteCache: { value: BlogSitePublic; at: number } | null = null

export async function loadSite(force = false): Promise<BlogSitePublic> {
  if (!force && siteCache && Date.now() - siteCache.at < 30_000) return siteCache.value
  const parsed = siteSchema.parse(await getJson<unknown>('/site')) as BlogSitePublic
  siteCache = { value: parsed, at: Date.now() }
  return parsed
}

export interface PostQuery {
  page?: number
  limit?: number
  category?: string
  tag?: string
  series?: string
  q?: string
  year?: number
  pinned?: boolean
}

export function loadPosts(query: PostQuery = {}): Promise<BlogPage<BlogPostSummary>> {
  return getJson<BlogPage<BlogPostSummary>>('/posts', { ...query })
}

export function loadPost(slug: string, unlockToken?: string | null): Promise<BlogPostDetail> {
  return getJson<BlogPostDetail>(
    `/posts/${encodeURIComponent(slug)}`,
    undefined,
    unlockToken ? { 'x-blog-unlock': unlockToken } : undefined,
  )
}

export function unlockPost(slug: string, password: string): Promise<{ token: string | null; expiresAt: number | null }> {
  return postJson(`/posts/${encodeURIComponent(slug)}/unlock`, { password })
}

export function loadAdjacent(slug: string): Promise<AdjacentPosts> {
  return getJson<AdjacentPosts>(`/posts/${encodeURIComponent(slug)}/adjacent`)
}

export function loadComments(slug: string, unlockToken?: string | null): Promise<BlogCommentsResponse> {
  return getJson<BlogCommentsResponse>(
    `/posts/${encodeURIComponent(slug)}/comments`,
    undefined,
    unlockToken ? { 'x-blog-unlock': unlockToken } : undefined,
  )
}

export function loadArchive(): Promise<{ years: BlogArchiveYear[] }> {
  return getJson<{ years: BlogArchiveYear[] }>('/archive')
}

export function loadTaxonomy(kind: 'categories' | 'tags' | 'series'): Promise<{ items: (TaxonomyItem | SeriesItem)[] }> {
  return getJson<{ items: (TaxonomyItem | SeriesItem)[] }>(`/${kind}`)
}

export function searchPosts(q: string, page = 1, limit = 10): Promise<BlogSearchResult> {
  return getJson<BlogSearchResult>('/search', { q, page, limit })
}

export function loadFeeds(): Promise<BlogFeedData> {
  return getJson<BlogFeedData>('/feeds')
}

export function loadCollection(kind: BlogCollectionKind): Promise<{ items: BlogCollectionItem[] }> {
  return getJson<{ items: BlogCollectionItem[] }>(`/collections/${kind}`)
}

export function loadAlbum(slug: string): Promise<BlogAlbumDetail> {
  return getJson<BlogAlbumDetail>(`/collections/albums/${encodeURIComponent(slug)}`)
}

export function loadCompass(): Promise<{ items: BlogCompassShelf[] }> {
  return getJson<{ items: BlogCompassShelf[] }>('/collections/compass')
}

export function loadPage(slug: string): Promise<BlogPageItem> {
  return getJson<BlogPageItem>(`/pages/${encodeURIComponent(slug)}`)
}

export function resolveRedirect(path: string): Promise<BlogRedirectResult> {
  return getJson<BlogRedirectResult>('/redirect', { path })
}

export function mediaUrl(value: string | null | undefined): string | null {
  if (!value) return null
  const match = /^\/api\/blog\/assets\/([^/?#]+)$/.exec(value)
  if (match) return `/_blog/media/${encodeURIComponent(match[1])}`
  return value
}
