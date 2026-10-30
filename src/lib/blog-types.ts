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
  discussion: {
    enabled: boolean
    requireNameEmail: boolean
    requireApproval: boolean
    allowReplies: boolean
    maxLength: number
    autoCloseDays: number
  }
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
