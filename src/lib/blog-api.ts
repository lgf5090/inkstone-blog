import { z } from 'zod'
import { blogApiOrigin, blogApiTimeoutMs, blogProxyKey } from '../server/origins'
import type {
  AdjacentPosts,
  BlogAlbumDetail,
  BlogArchiveYear,
  BlogCalendarEntry,
  BlogCollectionItem,
  BlogCollectionKind,
  BlogCommentsResponse,
  BlogCompassShelf,
  BlogFeedData,
  BlogFriends,
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
    banner: z.object({
      desktopLight: z.string().default(''),
      desktopDark: z.string().default(''),
      mobileLight: z.string().default(''),
      mobileDark: z.string().default(''),
    }).passthrough().default({ desktopLight: '', desktopDark: '', mobileLight: '', mobileDark: '' }),
  }).passthrough(),
  profile: z.object({
    name: z.string().default(''),
    bio: z.string().default(''),
    avatar: z.string().default(''),
    email: z.string().default(''),
    location: z.string().default(''),
    links: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
  }).passthrough().default({ name: '', bio: '', avatar: '', email: '', location: '', links: [] }),
  nav: z.array(z.object({
    label: z.string(),
    href: z.string(),
    children: z.array(z.object({ label: z.string(), href: z.string() })).optional(),
  })).default([]),
  sidebar: z.object({
    enable: z.boolean().default(true),
    arrangement: z.enum(['single', 'dual']).default('single'),
    side: z.enum(['left', 'right']).default('left'),
  }).passthrough().default({ enable: true, arrangement: 'single', side: 'left' }),
  widgets: z.array(z.object({
    id: z.string(),
    type: z.string(),
    title: z.string().default(''),
    enabled: z.boolean().default(true),
    config: z.record(z.string(), z.unknown()).default({}),
    slot: z.enum(['top', 'sticky']).optional(),
    column: z.enum(['primary', 'secondary']).optional(),
    pages: z.array(z.string()).optional(),
    collapseAfter: z.number().optional(),
  }).passthrough()).default([]),
  discussion: z.object({
    enabled: z.boolean().default(true),
    requireNameEmail: z.boolean().default(true),
    requireApproval: z.boolean().default(true),
    allowReplies: z.boolean().default(true),
    maxLength: z.number().default(4000),
    autoCloseDays: z.number().default(0),
  }).passthrough().default({ enabled: true, requireNameEmail: true, requireApproval: true, allowReplies: true, maxLength: 4000, autoCloseDays: 0 }),
  article: z.object({
    share: z.boolean().default(true),
    showLastUpdated: z.boolean().default(true),
    lastUpdatedDays: z.number().default(90),
    relatedCount: z.number().default(3),
    randomCount: z.number().default(2),
  }).passthrough().default({ share: true, showLastUpdated: true, lastUpdatedDays: 90, relatedCount: 3, randomCount: 2 }),
  license: z.object({
    enable: z.boolean().default(false),
    name: z.string().default(''),
    url: z.string().default(''),
  }).passthrough().default({ enable: false, name: '', url: '' }),
  footer: z.object({
    enable: z.boolean().default(true),
    html: z.string().default(''),
  }).passthrough().default({ enable: true, html: '' }),
  fab: z.object({
    enable: z.boolean().default(true),
    items: z.array(z.string()).default(['home', 'toc', 'comment', 'top']),
  }).passthrough().default({ enable: true, items: ['home', 'toc', 'comment', 'top'] }),
  announcement: z.object({
    enable: z.boolean().default(false),
    text: z.string().default(''),
    closable: z.boolean().default(true),
    linkText: z.string().default(''),
    linkUrl: z.string().default(''),
  }).passthrough().default({ enable: false, text: '', closable: true, linkText: '', linkUrl: '' }),
  llms: z.object({
    enable: z.boolean().default(true),
    excludeTags: z.array(z.string()).default([]),
  }).passthrough().default({ enable: true, excludeTags: [] }),
  comment: z.object({
    provider: z.enum(['none', 'local', 'twikoo', 'giscus', 'waline']).default('none'),
    twikoo: z.object({ envId: z.string().default('') }).passthrough().default({ envId: '' }),
    giscus: z.object({
      repo: z.string().default(''),
      repoId: z.string().default(''),
      category: z.string().default(''),
      categoryId: z.string().default(''),
    }).passthrough().default({ repo: '', repoId: '', category: '', categoryId: '' }),
    waline: z.object({ serverURL: z.string().default('') }).passthrough().default({ serverURL: '' }),
  }).passthrough().default({
    provider: 'none',
    twikoo: { envId: '' },
    giscus: { repo: '', repoId: '', category: '', categoryId: '' },
    waline: { serverURL: '' },
  }),
  contextMenu: z.object({
    enable: z.boolean().default(true),
    actions: z.array(z.string()).default(['copySelection', 'copyLink', 'openImage', 'copyImage', 'backToTop']),
  }).passthrough().default({ enable: true, actions: ['copySelection', 'copyLink', 'openImage', 'copyImage', 'backToTop'] }),
  permalink: z.object({ enable: z.boolean().default(false) }).passthrough().default({ enable: false }),
  display: z.record(z.string(), z.unknown()).default({}),
  integrations: z.object({
    comments: z.string().default('none'),
    music: z.object({
      enabled: z.boolean().default(false),
      provider: z.enum(['none', 'local', 'meting', 'custom', 'mixed']).default('none'),
      tracks: z.array(z.object({
        id: z.string(),
        title: z.string(),
        artist: z.string().optional(),
        source: z.string(),
        cover: z.string().optional(),
        duration: z.number().optional(),
      })).default([]),
      meting: z.object({
        server: z.enum(['netease', 'tencent', 'kugou', 'xiami', 'baidu']).default('netease'),
        type: z.enum(['playlist', 'song', 'album', 'artist']).default('playlist'),
        id: z.string().default(''),
        api: z.string().optional(),
      }).optional(),
      defaultVolume: z.number().default(0.7),
      defaultMode: z.enum(['sequence', 'repeat-one', 'shuffle']).default('sequence'),
    }).passthrough().default({ enabled: false, provider: 'none', tracks: [], defaultVolume: 0.7, defaultMode: 'sequence' }),
    umami: z.object({
      enabled: z.boolean().default(false),
      websiteId: z.string().default(''),
    }).passthrough().default({ enabled: false, websiteId: '' }),
  }).passthrough().default({ comments: 'none', music: { enabled: false, provider: 'none', tracks: [], defaultVolume: 0.7, defaultMode: 'sequence' }, umami: { enabled: false, websiteId: '' } }),
  runtimeVersion: z.string().optional(),
  counts: z.object({
    posts: z.number().default(0),
    categories: z.number().default(0),
    tags: z.number().default(0),
    series: z.number().default(0),
    views: z.number().default(0),
  }).passthrough().default({ posts: 0, categories: 0, tags: 0, series: 0, views: 0 }),
}).passthrough()

function apiHeaders(extra?: Record<string, string>): Record<string, string> {
  const key = blogProxyKey()
  return {
    ...(key ? { 'x-blog-proxy-key': key } : {}),
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
  const url = new URL(`${blogApiOrigin()}/api/blog${path}`)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  }
  let response: Response
  try {
    response = await fetch(url, {
      headers: apiHeaders(headers),
      signal: AbortSignal.timeout(blogApiTimeoutMs()),
    })
  } catch (cause) {
    throw new BlogApiError(503, cause instanceof Error ? cause.message : String(cause), 'blog_api_unreachable')
  }
  if (!response.ok) throw await failed(response)
  return (await response.json()) as T
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${blogApiOrigin()}/api/blog${path}`, {
      method: 'POST',
      headers: apiHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(blogApiTimeoutMs()),
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

export function loadPages(): Promise<{ items: BlogPageItem[] }> {
  return getJson<{ items: BlogPageItem[] }>('/pages')
}

export function loadTaxonomy(kind: 'categories' | 'tags' | 'series'): Promise<{ items: (TaxonomyItem | SeriesItem)[] }> {
  return getJson<{ items: (TaxonomyItem | SeriesItem)[] }>(`/${kind}`)
}

export function loadCalendar(): Promise<{ items: BlogCalendarEntry[] }> {
  return getJson<{ items: BlogCalendarEntry[] }>('/calendar')
}

export function resolvePostPermalink(path: string): Promise<{ found: boolean; slug?: string }> {
  return getJson<{ found: boolean; slug?: string }>(`/permalink?path=${encodeURIComponent(path)}`)
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

export function loadFriends(): Promise<BlogFriends> {
  return getJson<BlogFriends>('/friends')
}

export function loadAlbum(slug: string, token?: string): Promise<BlogAlbumDetail> {
  return getJson<BlogAlbumDetail>(
    `/collections/albums/${encodeURIComponent(slug)}`,
    undefined,
    token ? { 'x-blog-album-unlock': token } : undefined,
  )
}

export function unlockAlbum(slug: string, password: string): Promise<{ token: string | null; notProtected?: boolean; expiresAt?: number }> {
  return postJson<{ token: string | null; notProtected?: boolean; expiresAt?: number }>(`/collections/albums/${encodeURIComponent(slug)}/unlock`, { password })
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
