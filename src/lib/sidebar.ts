import type { BlogSitePublic, BlogWidget, SeriesItem, TaxonomyItem } from './blog-types'

export type SidebarColumn = 'primary' | 'secondary'
export type SidebarQuery = SidebarColumn | 'all'

/** The slice of the runtime config the rail needs; keeps Astro fallback objects assignable. */
export interface SidebarData {
  site: BlogSitePublic
  categories: TaxonomyItem[]
  tags: TaxonomyItem[]
  series: SeriesItem[]
}

// These mirror the widget ids the Inkstone settings screen writes. They are the
// defaults a site without an explicit widget list still gets, so the shell never
// renders an empty rail on a fresh install.
const FALLBACK_WIDGETS: BlogWidget[] = [
  { id: 'profile', type: 'profile', title: '', enabled: true, config: {} },
  { id: 'search', type: 'search', title: '', enabled: true, config: {} },
  { id: 'categories', type: 'categories', title: '', enabled: true, config: {} },
  { id: 'tags', type: 'tags', title: '', enabled: true, config: {} },
  { id: 'series', type: 'series', title: '', enabled: true, config: {} },
]

const SECONDARY_TYPES = new Set(['categories', 'tags', 'series', 'stats', 'calendar'])

export function widgetColumn(widget: BlogWidget): SidebarColumn {
  return widget.column === 'primary' || widget.column === 'secondary'
    ? widget.column
    : SECONDARY_TYPES.has(widget.type) ? 'secondary' : 'primary'
}

export function allWidgets(blog: SidebarData): BlogWidget[] {
  const configured = blog.site.widgets ?? []
  return configured.length > 0 ? configured : FALLBACK_WIDGETS
}

/** Widgets enabled for this page and belonging to the requested column. */
export function sidebarWidgets(blog: SidebarData, page: string, column: SidebarQuery): BlogWidget[] {
  return allWidgets(blog).filter((widget) => widget.enabled
    && (!widget.pages?.length || widget.pages.includes(page))
    && (column === 'all' || widgetColumn(widget) === column))
}

function profileHasContent(blog: SidebarData): boolean {
  const profile = blog.site.profile
  return Boolean(profile.name || profile.bio || profile.avatar || profile.email || profile.location || profile.links.length > 0)
}

/**
 * A visible widget still renders nothing when its data source is empty (a tag
 * list with no tags, a profile card with every field blank). The shell asks
 * this before reserving a rail so "all cards off" collapses to one column.
 */
function widgetHasContent(widget: BlogWidget, blog: SidebarData): boolean {
  switch (widget.type) {
    case 'profile':
      return profileHasContent(blog)
    case 'search':
      return true
    case 'categories':
      return blog.categories.length > 0
    case 'tags':
      return blog.tags.length > 0
    case 'series':
      return blog.series.length > 0
    case 'recent':
    case 'stats':
    case 'calendar':
      return true
    case 'announcement':
      return typeof widget.config.text === 'string' && widget.config.text.trim().length > 0
    case 'custom':
      return typeof widget.config.html === 'string' && widget.config.html.trim().length > 0
    default:
      return false
  }
}

export function isSortedTop(widget: BlogWidget): boolean {
  return widget.slot === 'top'
}

export function sidebarHasContent(blog: SidebarData, page: string, column: SidebarColumn): boolean {
  if (column === 'primary') {
    const announcement = blog.site.announcement
    if (announcement?.enable && announcement.text.trim()) return true
  }
  return sidebarWidgets(blog, page, column).some((widget) => widgetHasContent(widget, blog))
}
