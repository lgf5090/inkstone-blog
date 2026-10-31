<script lang="ts">
  import { t, type BlogLocale } from '../../i18n'
  import type { BlogCalendarEntry } from '../../lib/blog-types'

  interface Props {
    locale: BlogLocale
    timeZone: string
    items: BlogCalendarEntry[]
  }
  let { locale, timeZone, items }: Props = $props()

  const pad = (value: number) => String(value).padStart(2, '0')
  function partsOf(ms: number): { year: number; month: number; day: number } {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(ms))
    const pick = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0)
    return { year: pick('year'), month: pick('month'), day: pick('day') }
  }

  const today = partsOf(Date.now())
  let year = $state(today.year)
  let month = $state(today.month)
  let selected = $state<string | null>(null)

  const byDate = $derived.by(() => {
    const map = new Map<string, BlogCalendarEntry[]>()
    for (const item of items) {
      const parts = partsOf(item.publishedAt)
      const key = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    return map
  })
  const activeMonths = $derived(
    [...new Set([...byDate.keys()].map((key) => key.slice(0, 7)))].sort(),
  )
  const monthKey = $derived(`${year}-${pad(month)}`)
  const monthTitle = $derived(
    new Intl.DateTimeFormat(locale, { timeZone, year: 'numeric', month: 'long' }).format(
      new Date(Date.UTC(year, month - 1, 15, 12)),
    ),
  )
  const weekdays = $derived(
    Array.from({ length: 7 }, (_, index) =>
      new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(
        new Date(Date.UTC(2021, 0, 4 + index, 12)),
      ),
    ),
  )
  const cells = $derived.by(() => {
    const leading = (new Date(Date.UTC(year, month - 1, 1, 12)).getUTCDay() + 6) % 7
    const days = new Date(Date.UTC(year, month, 0, 12)).getUTCDate()
    const out: Array<{ day: number; key: string; posts: BlogCalendarEntry[] } | null> = Array.from(
      { length: leading },
      () => null,
    )
    for (let day = 1; day <= days; day++) {
      const key = `${year}-${pad(month)}-${pad(day)}`
      out.push({ day, key, posts: byDate.get(key) ?? [] })
    }
    return out
  })
  const selectedPosts = $derived(selected ? (byDate.get(selected) ?? []) : [])
  const prevTarget = $derived([...activeMonths].reverse().find((key) => key < monthKey) ?? null)
  const nextTarget = $derived(activeMonths.find((key) => key > monthKey) ?? null)
  const canPrev = $derived(activeMonths.length === 0 || Boolean(prevTarget))
  const canNext = $derived(activeMonths.length === 0 || Boolean(nextTarget))

  function moveTo(target: string | null, fallbackDelta: number) {
    if (activeMonths.length > 0) {
      if (!target) return
      const [nextYear, nextMonth] = target.split('-').map(Number)
      year = nextYear ?? year
      month = nextMonth ?? month
    } else {
      const next = new Date(Date.UTC(year, month - 1 + fallbackDelta, 15))
      year = next.getUTCFullYear()
      month = next.getUTCMonth() + 1
    }
    selected = null
  }

  function backToToday() {
    year = today.year
    month = today.month
    selected = null
  }

  const isToday = (key: string) => key === `${today.year}-${pad(today.month)}-${pad(today.day)}`
</script>

<div class="calendar-widget">
  <div class="calendar-head">
    <button type="button" class="calendar-nav" disabled={!canPrev} aria-label={t(locale, 'calendar.prevMonth')} onclick={() => moveTo(prevTarget, -1)}>‹</button>
    <button type="button" class="calendar-month" title={t(locale, 'calendar.backToday')} onclick={backToToday}>{monthTitle}</button>
    <button type="button" class="calendar-nav" disabled={!canNext} aria-label={t(locale, 'calendar.nextMonth')} onclick={() => moveTo(nextTarget, 1)}>›</button>
  </div>
  <div class="calendar-weekdays" aria-hidden="true">
    {#each weekdays as day}<span>{day}</span>{/each}
  </div>
  <div class="calendar-grid" role="grid" aria-label={monthTitle}>
    {#each cells as cell}
      {#if cell}
        <button
          type="button"
          class="calendar-day"
          class:has-posts={cell.posts.length > 0}
          class:today={isToday(cell.key)}
          class:selected={selected === cell.key}
          disabled={cell.posts.length === 0}
          aria-pressed={selected === cell.key}
          aria-label={`${cell.key} · ${cell.posts.length} ${t(locale, 'calendar.posts')}`}
          onclick={() => (selected = selected === cell.key ? null : cell.key)}
        >
          <span>{cell.day}</span>
          {#if cell.posts.length > 0}<i aria-hidden="true"></i>{/if}
        </button>
      {:else}
        <span class="calendar-blank" aria-hidden="true"></span>
      {/if}
    {/each}
  </div>
  {#if selectedPosts.length > 0}
    <ul class="calendar-posts">
      {#each selectedPosts as post}
        <li><a href={`/posts/${encodeURIComponent(post.slug)}`}>{post.title}</a></li>
      {/each}
    </ul>
  {/if}
</div>
