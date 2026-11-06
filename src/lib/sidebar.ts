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

export function isSortedTop(widget: BlogWidget): boolean {
  return widget.slot === 'top'
}

/**
 * Whether a rail has anything to show.
 *
 * Every enabled widget renders a card of its own: an empty profile or a taxonomy with no rows
 * draws an explicit empty state instead of disappearing, so the rail is reserved by the widget
 * list rather than by whether its data happens to be present. The legacy announcement sits above
 * the widgets and is the one card that still depends on its own text.
 */
export function sidebarHasContent(blog: SidebarData, page: string, column: SidebarColumn): boolean {
  if (column === 'primary') {
    const announcement = blog.site.announcement
    if (announcement?.enable && announcement.text.trim()) return true
  }
  return sidebarWidgets(blog, page, column).length > 0
}
