export interface BlogHeading {
  depth: number
  slug: string
  text: string
  html?: string
}

export interface BlogRenderSnapshot {
  version: 1
  rendererVersion: string
  noteId: string
  contentHash: string
  html: string
  headings: BlogHeading[]
  fences: Record<string, string[]>
  features: string[]
  settings: { locale: string; emojiShortcodes: boolean }
  generatedAt?: number
  warnings?: string[]
}

export interface BlogPostSummary {
  id: string
  slug: string
  title: string
  excerpt: string
  description: string
  coverUrl: string | null
  category: string | null
  series: string | null
  seriesOrder: number | null
  tags: string[]
  pinned: boolean
  language: string
  publishedAt: number | null
  updatedAt: number
  wordCount: number
  readingMinutes: number
  encrypted: boolean
  hideHomeContent: boolean
}

export interface BlogPostDetail extends BlogPostSummary {
  content: string | null
  headings: BlogHeading[]
  render: BlogRenderSnapshot | null
  renderStatus: 'missing' | 'ready' | 'stale' | 'failed'
  commentsEnabled: boolean
  license: string
  alias: string
  permalink: string
}

export interface BlogWidget {
  id: string
  type: string
  title: string
  enabled: boolean
  config: Record<string, unknown>
}

export interface BlogSitePublic {
  site: {
    title: string
    subtitle: string
    description: string
    url: string
    locale: string
    timeZone: string
    themeColor: { hue: number; style: string; spec: string }
  }
  profile: {
    name: string
    bio: string
    avatar: string
    links: { label: string; url: string }[]
  }
  nav: { label: string; href: string; children?: { label: string; href: string }[] }[]
  sidebar: { enable: boolean; arrangement: 'single' | 'dual'; side: 'left' | 'right'; widgets: string[] }
  widgets: BlogWidget[]
  discussion: {
    enabled: boolean
    requireNameEmail: boolean
    requireApproval: boolean
    allowReplies: boolean
    maxLength: number
    autoCloseDays: number
  }
  display: Record<string, unknown>
  integrations: { comments: string; music: string; umami: string }
  counts: { posts: number; categories: number; tags: number; series: number }
}

export interface PublicBlogComment {
  id: string
  parentId: string | null
  authorName: string
  authorUrl: string
  content: string
  createdAt: number
  replies: PublicBlogComment[]
}

export interface BlogCommentsResponse {
  enabled: boolean
  discussion: {
    requireNameEmail: boolean
    requireApproval: boolean
    allowReplies: boolean
    maxLength: number
  }
  items: PublicBlogComment[]
}

export interface BlogPage<T> {
  items: T[]
  page: number
  limit: number
  total: number
  nextCursor: string | null
}

export interface TaxonomyItem {
  id: string
  name: string
  slug: string
  description?: string
  color?: string | null
  count: number
}

export interface SeriesItem extends TaxonomyItem {
  overview?: string
  status?: string
}

export interface BlogArchiveYear {
  year: string
  count: number
  months: { month: string; count: number }[]
}

export interface AdjacentPosts {
  previous: BlogPostSummary | null
  next: BlogPostSummary | null
}

export interface BlogSearchResult extends BlogPage<BlogPostSummary> {
  query: string
  engine: 'fts' | 'like'
}

export interface BlogFeedData {
  site: BlogSitePublic
  posts: BlogPostSummary[]
}

export type BlogCollectionKind =
  | 'moments'
  | 'albums'
  | 'friends'
  | 'projects'
  | 'skills'
  | 'devices'
  | 'games'
  | 'anime'
  | 'timeline'
  | 'compass'

export interface BlogCollectionItem {
  id: string
  kind: BlogCollectionKind
  title: string
  slug: string
  status: string
  publishedAt: number | null
  updatedAt: number
  data: Record<string, unknown>
}

export interface BlogAlbumPhoto {
  id: string
  assetId: string
  url: string
  caption: string
  alt: string
  takenAt: string
  position: number
}

export interface BlogAlbumDetail {
  album: {
    id: string
    slug: string
    title: string
    description: string
    coverUrl: string | null
    date: string
    location: string
    tags: string[]
    layout: string
    columns: number
    publishedAt: number | null
  }
  photos: BlogAlbumPhoto[]
}

export interface BlogCompassShelf {
  id: string
  key: string
  name: string
  icon: string
  blurb: string
  position: number
  entries: { label: string; href: string; note: string; icon: string; image: string }[]
}

export interface BlogPageItem {
  id: string
  slug: string
  title: string
  kind: string
  body: string
  noteId: string | null
  publishedAt: number | null
  updatedAt: number
}

export interface BlogRedirectResult {
  found: boolean
  to?: string
  status?: number
}
