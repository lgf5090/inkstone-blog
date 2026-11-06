export interface BlogHeading {
  depth: number
  slug: string
  text: string
  html?: string
}

export interface BlogReadingSettings {
  locale: string
  emojiShortcodes: boolean
  math?: boolean
  mermaid?: boolean
  chart?: boolean
  codeBlockCollapse?: boolean
  codeBlockCollapseLines?: number
  jsonView?: 'source' | 'tree' | 'map'
  jsonFold?: number
  jsonTolerant?: boolean
}

export interface BlogEmbeddedNote {
  id: string
  title: string
  content: string
}

export interface BlogAssetRef {
  attachmentId?: string
  blogAssetId?: string
  url: string
  filename?: string
  mime?: string
  size?: number
  width?: number | null
  height?: number | null
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
  settings: BlogReadingSettings
  embeds?: BlogEmbeddedNote[]
  assets?: BlogAssetRef[]
  wikiLinks?: Array<{ target: string; slug: string | null }>
  generatedAt?: number
  warnings?: string[]
}

export interface BlogPostSummary {
  id: string
  slug: string
  permalink?: string
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
  likeCount: number
}

export interface BlogEngagementState {
  likeCount: number
  liked: boolean
  favorited: boolean
}

export interface BlogSavedPost extends BlogPostSummary {
  savedAt: number
}

export interface BlogNewsletterSubscribeResult {
  status: 'pending' | 'confirmed' | 'unsubscribed'
  emailSent: boolean
  delivery: 'sent' | 'unavailable' | 'failed' | 'cooldown' | 'already_confirmed' | 'ignored'
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
  viewCount: number
}

export interface BlogAuthor {
  slug: string
  name: string
  avatar: string
  bio: string
  email: string
  location: string
  links: { label: string; url: string }[]
  articleCount: number
}

export interface BlogAuthorPage extends BlogPage<BlogPostSummary> {
  author: BlogAuthor
}

/** A draft read through its preview token; it is never part of a public listing. */
export interface BlogPreviewDetail {
  preview: true
  id: string
  slug: string
  title: string
  excerpt: string
  description: string
  coverUrl: string | null
  category: string | null
  series: string | null
  tags: string[]
  publishedAt: number | null
  updatedAt: number
  wordCount: number
  readingMinutes: number
  encrypted: boolean
  content: string
}

export interface BlogWidget {
  id: string
  slot?: 'top' | 'sticky'
  column?: 'primary' | 'secondary'
  pages?: string[]
  collapseAfter?: number
  type: string
  title: string
  enabled: boolean
  config: Record<string, unknown>
}

export interface BlogMusicTrack {
  id: string
  title: string
  artist?: string
  source: string
  cover?: string
  duration?: number
}

export interface BlogMusicMeting {
  server: 'netease' | 'tencent' | 'kugou' | 'xiami' | 'baidu'
  type: 'playlist' | 'song' | 'album' | 'artist'
  id: string
  api?: string
}

export interface BlogMusicConfig {
  enabled: boolean
  provider: 'none' | 'local' | 'meting' | 'custom' | 'mixed' | 'library'
  tracks: BlogMusicTrack[]
  meting?: BlogMusicMeting
  libraryScope?: 'all' | 'playlist'
  libraryPlaylistId?: string
  libraryPlaylistName?: string
  libraryStatus?: 'ready' | 'empty' | 'no-r2' | 'playlist-empty' | 'playlist-missing' | 'signing-unavailable'
  defaultVolume: number
  defaultMode: 'sequence' | 'repeat-one' | 'shuffle'
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
    banner: { desktopLight: string; desktopDark: string; mobileLight: string; mobileDark: string }
  }
  profile: {
    slug: string
    name: string
    bio: string
    avatar: string
    email: string
    location: string
    links: { label: string; url: string }[]
  }
  nav: { label: string; href: string; children?: { label: string; href: string }[] }[]
  sidebar: { enable: boolean; arrangement: 'single' | 'dual'; side: 'left' | 'right' }
  widgets: BlogWidget[]
  discussion: {
    enabled: boolean
    requireNameEmail: boolean
    requireApproval: boolean
    allowReplies: boolean
    maxLength: number
    autoCloseDays: number
  }
  article: {
    share: boolean
    showLastUpdated: boolean
    lastUpdatedDays: number
    relatedCount: number
    randomCount: number
  }
  license: { enable: boolean; name: string; url: string }
  footer: { enable: boolean; html: string }
  fab: { enable: boolean; items: string[] }
  announcement: { enable: boolean; text: string; closable: boolean; linkText: string; linkUrl: string }
  llms: { enable: boolean; excludeTags: string[] }
  comment: {
    provider: 'none' | 'local' | 'twikoo' | 'giscus' | 'waline'
    twikoo: { envId: string }
    giscus: { repo: string; repoId: string; category: string; categoryId: string }
    waline: { serverURL: string }
  }
  contextMenu: { enable: boolean; actions: string[] }
  permalink: { enable: boolean }
  display: Record<string, unknown>
  integrations: { comments: string; music: BlogMusicConfig; umami: { enabled: boolean; websiteId: string } }
  runtimeVersion?: string
  counts: { posts: number; categories: number; tags: number; series: number; views: number }
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

export interface BlogCalendarEntry {
  slug: string
  title: string
  publishedAt: number
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

/**
 * A feed row may carry the rendered body as well as its summary. The frontend
 * accepts the field under either spelling so it works with a backend that
 * includes HTML in `/feeds` and with one that only exposes the detail route.
 */
export interface BlogFeedPost extends BlogPostSummary {
  content?: string | null
  contentHtml?: string | null
  html?: string | null
}

export interface BlogFeedData {
  site: BlogSitePublic
  posts: BlogFeedPost[]
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

export interface BlogFriendCategory {
  id: string
  name: string
  icon: string
  parentId: string | null
  depth: number
  count: number
}

export interface BlogFriendLink {
  id: string
  title: string
  url: string
  icon: string | null
  description: string
  categoryId: string
  pinned: boolean
}

export interface BlogFriends {
  rootId: string
  categories: BlogFriendCategory[]
  links: BlogFriendLink[]
  cardStyle: 'detailed' | 'simple'
  search: {
    mode: 'internal' | 'external'
    sources: { id: string; name: string; url: string }[]
  }
}
