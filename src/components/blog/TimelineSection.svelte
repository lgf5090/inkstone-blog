<script lang="ts">
  import { onMount } from 'svelte'
  import { t, type BlogLocale } from '../../i18n'
  import type { BlogCollectionItem } from '../../lib/blog-types'

  let { items, locale }: { items: BlogCollectionItem[]; locale: BlogLocale } = $props()

  const text = (data: Record<string, unknown>, key: string): string =>
    typeof data[key] === 'string' ? data[key] as string : ''
  const list = (data: Record<string, unknown>, key: string): unknown[] =>
    Array.isArray(data[key]) ? data[key] as unknown[] : []
  const categories = $derived(
    Array.from(new Set(items.map((item) => text(item.data, 'category')).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b)),
  )
  let selected = $state('')
  let initialized = $state(false)
  const filtered = $derived(selected ? items.filter((item) => text(item.data, 'category') === selected) : items)

  function safeUrl(value: string): string | null {
    return /^https?:\/\//i.test(value) ? value : null
  }

  function linksOf(item: BlogCollectionItem): Array<{ label: string; url: string }> {
    return list(item.data, 'links').flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return []
      const record = entry as Record<string, unknown>
      const url = typeof record.url === 'string' ? safeUrl(record.url) : null
      if (!url) return []
      return [{ label: typeof record.label === 'string' && record.label ? record.label : url, url }]
    })
  }

  onMount(() => {
    const category = new URLSearchParams(window.location.search).get('category') ?? ''
    if (categories.includes(category)) selected = category
    initialized = true
  })

  $effect(() => {
    const category = selected
    if (!initialized) return
    const params = new URLSearchParams(window.location.search)
    if (category) params.set('category', category)
    else params.delete('category')
    const next = params.toString()
    history.replaceState(history.state, '', next ? `${window.location.pathname}?${next}` : window.location.pathname)
  })
</script>

<section class="timeline-section" aria-labelledby="timeline-title">
  <div class="timeline-head">
    <div>
      <h1 id="timeline-title">{t(locale, 'nav.timeline')}</h1>
      <p>{filtered.length}</p>
    </div>
  </div>

  {#if categories.length > 1}
    <div class="timeline-chips" role="group" aria-label={t(locale, 'nav.timeline')}>
      <button type="button" class:active={!selected} aria-pressed={!selected} onclick={() => (selected = '')}>{t(locale, 'collections.all')}</button>
      {#each categories as category (category)}
        <button type="button" class:active={selected === category} aria-pressed={selected === category} onclick={() => (selected = category)}>{category}</button>
      {/each}
    </div>
  {/if}

  {#if filtered.length === 0}
    <div class="timeline-empty">{t(locale, 'collections.noResults')}</div>
  {:else}
    <div class="timeline-list">
      {#each filtered as item, index (item.id)}
        {@const highlights = list(item.data, 'highlights')}
        {@const tags = list(item.data, 'tags')}
        {@const links = linksOf(item)}
        {@const date = text(item.data, 'date')}
        {@const category = text(item.data, 'category')}
        {@const subtitle = text(item.data, 'subtitle')}
        {@const location = text(item.data, 'location')}
        {@const featured = item.data.featured === true || item.data.featured === 1}
        <article class="timeline-entry" class:timeline-entry--featured={featured} class:timeline-entry--last={index === filtered.length - 1}>
          <div class="timeline-rail" aria-hidden="true">
            <span class="timeline-track"></span>
            <span class="timeline-marker">{featured ? '★' : '•'}</span>
          </div>
          <div class="timeline-body">
            <div class="timeline-meta">
              {#if date}<time>{date}</time>{/if}
              {#if category}<span>{category}</span>{/if}
            </div>
            <h2>{item.title}</h2>
            {#if subtitle || location}
              <p class="timeline-sub">{[subtitle, location].filter(Boolean).join(' · ')}</p>
            {/if}
            {#if text(item.data, 'description')}<p class="timeline-desc">{text(item.data, 'description')}</p>{/if}
            {#if highlights.length > 0}
              <ul class="timeline-highlights">
                {#each highlights as highlight (String(highlight))}<li>{String(highlight)}</li>{/each}
              </ul>
            {/if}
            {#if tags.length > 0}
              <div class="timeline-tags">
                {#each tags as tag (String(tag))}<span>#{String(tag)}</span>{/each}
              </div>
            {/if}
            {#if links.length > 0}
              <div class="timeline-links">
                {#each links as link (link.url)}<a href={link.url} target="_blank" rel="noopener noreferrer">{link.label}</a>{/each}
              </div>
            {/if}
          </div>
        </article>
      {/each}
    </div>
  {/if}
</section>

<style>
  .timeline-section { display: flex; flex-direction: column; gap: 1rem; min-width: 0; }
  .timeline-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; }
  .timeline-head h1 { margin: 0; color: var(--on-surface); font-size: var(--text-30); line-height: 1.2; letter-spacing: -0.02em; }
  .timeline-head p { margin: 0; color: var(--on-surface-variant); font-size: var(--text-13); font-variant-numeric: tabular-nums; }
  .timeline-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; padding-bottom: 0.9rem; border-bottom: 1px solid var(--outline-variant); }
  .timeline-chips button { border: 1px solid var(--border-subtle); border-radius: var(--r-sm); background: transparent; color: var(--text-secondary); min-height: var(--btn-h-sm-compact); padding: 0 var(--sp-3); font: inherit; font-size: var(--text-11-5); cursor: pointer; }
  .timeline-chips button:hover { background: var(--surface-container); color: var(--on-surface); }
  .timeline-chips button.active { background: var(--accent-soft); color: var(--accent-on-soft); border-color: transparent; }
  .timeline-list { display: flex; flex-direction: column; }
  .timeline-entry { display: flex; align-items: stretch; gap: 1rem; min-width: 0; }
  .timeline-rail { position: relative; display: flex; flex-direction: column; align-items: center; flex: none; width: 2.4rem; }
  .timeline-track { position: absolute; top: 0; bottom: 0; left: 50%; width: 2px; transform: translateX(-50%); background: var(--outline-variant); }
  .timeline-entry--last .timeline-track { bottom: auto; height: 1.6rem; }
  .timeline-marker { position: relative; z-index: 1; display: grid; place-items: center; width: 2.1rem; height: 2.1rem; margin-top: 0.55rem; border: 2px solid var(--outline-variant); border-radius: var(--r-full); background: var(--surface-container-high); color: var(--on-surface-variant); box-shadow: 0 0 0 4px var(--card-bg); font-size: var(--text-14-5); }
  .timeline-entry--featured .timeline-marker { border-color: var(--primary); background: var(--primary-container); color: var(--on-primary-container); }
  .timeline-body { min-width: 0; flex: 1; padding: 0.35rem 0 1.6rem; }
  .timeline-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; color: var(--on-surface-variant); font-size: var(--text-11); }
  .timeline-meta > span { border-radius: var(--r-full); background: var(--surface-container); padding: 0.12rem 0.5rem; }
  .timeline-body h2 { margin: 0.25rem 0 0.15rem; color: var(--on-surface); font-size: var(--text-16); line-height: 1.35; }
  .timeline-sub { margin: 0 0 0.35rem; color: var(--primary); font-size: var(--text-12); }
  .timeline-desc { margin: 0 0 0.5rem; color: var(--on-surface-variant); font-size: var(--text-13); line-height: 1.6; white-space: pre-wrap; }
  .timeline-highlights { margin: 0.2rem 0 0.55rem; padding-left: 1.1rem; color: var(--on-surface-variant); font-size: var(--text-12-5); line-height: 1.6; }
  .timeline-tags, .timeline-links { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.35rem; }
  .timeline-tags span { color: var(--on-surface-variant); font-size: var(--text-11); }
  .timeline-links a { border: 1px solid var(--outline-variant); border-radius: var(--r-full); padding: 0.2rem 0.6rem; color: var(--primary); font-size: var(--text-11); text-decoration: none; }
  .timeline-links a:hover { background: var(--surface-container); }
  .timeline-empty { padding: 3rem 1rem; text-align: center; color: var(--on-surface-variant); border: 1px dashed var(--outline-variant); border-radius: var(--radius-lg); font-size: var(--text-13); }
  @media (max-width: 640px) {
    .timeline-entry { gap: 0.55rem; }
    .timeline-rail { width: 1.8rem; }
    .timeline-marker { width: 1.6rem; height: 1.6rem; font-size: var(--text-11); }
  }
</style>
