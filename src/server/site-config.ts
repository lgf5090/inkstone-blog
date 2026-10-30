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
  }
  article: {
    showLastUpdated: boolean
    relatedCount: number
    randomCount: number
    share: boolean
  }
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
  },
  profile: { name: '', bio: '', avatar: '', links: [] },
  nav: [{ label: 'Posts', href: '/' }],
  sidebar: { enable: true, arrangement: 'single', side: 'left', widgets: [] },
  widgets: [],
  discussion: {
    enabled: true,
    requireNameEmail: true,
    requireApproval: true,
    allowReplies: true,
    maxLength: 4000,
    autoCloseDays: 0,
  },
  display: {},
  integrations: { comments: 'none', music: 'none', umami: { enabled: false, websiteId: '' } },
  counts: { posts: 0, categories: 0, tags: 0, series: 0 },
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
    },
    article: {
      showLastUpdated: display.articleLastUpdated !== false,
      relatedCount: numberSetting(display.relatedCount, 3, 0, 12),
      randomCount: numberSetting(display.randomCount, 2, 0, 12),
      share: display.articleShare !== false,
    },
  }
}
