import type { BlogSitePublic, SeriesItem, TaxonomyItem } from '../lib/blog-types'

export interface BlogRuntimeConfig {
  site: BlogSitePublic
  categories: TaxonomyItem[]
  tags: TaxonomyItem[]
  series: SeriesItem[]
  banner: {
    title: string
    subtitle: string
    hue: number
    gradient: boolean
    typewriter: boolean
    waves: boolean
    texture: boolean
  }
  display: {
    postListMode: 'list' | 'grid' | 'masonry'
    pageSize: number
    tocDepth: number
    progressStyle: 'dual' | 'single'
    feedFullText: boolean
  }
  article: {
    showLastUpdated: boolean
    lastUpdatedDays: number
    relatedCount: number
    randomCount: number
    share: boolean
  }
  music: BlogSitePublic['integrations']['music']
  fab: BlogSitePublic['fab']
  runtimeVersion: string
}

export const FALLBACK_SITE: BlogSitePublic = {
  site: {
    title: 'Inkstone Blog',
    subtitle: '',
    description: 'A blog powered by Inkstone notes.',
    url: '',
    locale: 'en',
    timeZone: 'UTC',
    themeColor: { hue: 315, style: 'tonalSpot', spec: '2025' },
    banner: { desktopLight: '', desktopDark: '', mobileLight: '', mobileDark: '' },
  },
  profile: { slug: '', name: '', bio: '', avatar: '', email: '', location: '', links: [] },
  nav: [{ label: 'Posts', href: '/' }],
  sidebar: { enable: true, arrangement: 'single', side: 'left' },
  widgets: [],
  discussion: {
    enabled: true,
    requireNameEmail: true,
    requireApproval: true,
    allowReplies: true,
    maxLength: 4000,
    autoCloseDays: 0,
  },
  article: { share: true, showLastUpdated: true, lastUpdatedDays: 90, relatedCount: 3, randomCount: 2 },
  license: { enable: false, name: '', url: '' },
  footer: { enable: true, html: '' },
  fab: { enable: true, items: ['home', 'toc', 'comment', 'top'] },
  announcement: { enable: false, text: '', closable: true, linkText: '', linkUrl: '' },
  llms: { enable: true, excludeTags: [] },
  comment: {
    provider: 'none',
    twikoo: { envId: '' },
    giscus: { repo: '', repoId: '', category: '', categoryId: '' },
    waline: { serverURL: '' },
  },
  contextMenu: { enable: true, actions: ['copySelection', 'copyLink', 'openImage', 'copyImage', 'backToTop'] },
  permalink: { enable: false },
  display: {},
  integrations: { comments: 'none', music: { enabled: false, provider: 'none', tracks: [], defaultVolume: 0.7, defaultMode: 'sequence' }, umami: { enabled: false, websiteId: '' } },
  runtimeVersion: 'inkstone-blog-v3',
  counts: { posts: 0, categories: 0, tags: 0, series: 0, views: 0 },
}

function numberSetting(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(parsed) ? Math.min(Math.max(Math.trunc(parsed), min), max) : fallback
}

export function buildRuntimeConfig(
  site: BlogSitePublic,
  categories: TaxonomyItem[],
  tags: TaxonomyItem[],
  series: SeriesItem[],
): BlogRuntimeConfig {
  const display = site.display ?? {}
  return {
    site,
    categories,
    tags,
    series,
    banner: {
      title: site.site.title,
      subtitle: site.site.subtitle || site.site.description,
      hue: numberSetting(site.site.themeColor?.hue, 315, 0, 360),
      gradient: true,
      typewriter: display.bannerTypewriter !== false,
      waves: display.bannerWaves !== false,
      texture: display.bannerTexture !== false,
    },
    display: {
      postListMode: display.postListMode === 'grid' || display.postListMode === 'masonry' ? display.postListMode : 'list',
      pageSize: numberSetting(display.postListPageSize, 10, 1, 50),
      tocDepth: numberSetting(display.tocDepth, 2, 1, 6),
      progressStyle: display.progressStyle === 'single' ? 'single' : 'dual',
      // Persisted in the same `blog_settings.display` JSON as the other display
      // switches; it reaches the feed through the public `/site` projection.
      feedFullText: display.feedFullText === true,
    },
    article: site.article,
    music: site.integrations.music,
    fab: site.fab,
    runtimeVersion: site.runtimeVersion ?? 'inkstone-blog-v3',
  }
}
