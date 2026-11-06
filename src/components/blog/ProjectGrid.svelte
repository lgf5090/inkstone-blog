<script lang="ts">
  import { onMount } from 'svelte'
  import type { BlogLocale } from '../../i18n'
  import { translator, type ClientMessages } from '../../i18n/client'
  import type { BlogCollectionItem } from '../../lib/blog-types'

  let { items, locale, messages }: { items: BlogCollectionItem[]; locale: BlogLocale; messages: ClientMessages } = $props()
  const tr = $derived(translator(messages))

  const text = (data: Record<string, unknown>, key: string): string =>
    typeof data[key] === 'string' ? data[key] as string : ''
  const list = (data: Record<string, unknown>, key: string): unknown[] =>
    Array.isArray(data[key]) ? data[key] as unknown[] : []
  const cover = (item: BlogCollectionItem): string | null => {
    const asset = item.data.cover_asset_id
    if (typeof asset === 'string' && asset) return `/_blog/media/${asset}`
    const url = text(item.data, 'icon')
    return /^(https?:\/\/|\/)/i.test(url) ? url : null
  }
  const safeUrl = (value: string): string | null => /^https?:\/\//i.test(value) ? value : null
  const categories = $derived(
    Array.from(new Set(items.map((item) => text(item.data, 'category')).filter(Boolean))).sort(),
  )
  let query = $state('')
  let selectedCategory = $state('')
  let initialized = $state(false)
  const filtered = $derived(items.filter((item) => {
    const category = text(item.data, 'category')
    if (selectedCategory && category !== selectedCategory) return false
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    return [
      item.title,
      text(item.data, 'summary'),
      category,
      text(item.data, 'phase'),
      text(item.data, 'year'),
      ...list(item.data, 'technologies').map(String),
    ].join(' ').toLowerCase().includes(needle)
  }))

  function initial(value: string): string {
    return Array.from(value.trim())[0]?.toUpperCase() ?? '?'
  }

  onMount(() => {
    const params = new URLSearchParams(window.location.search)
    query = params.get('q') ?? ''
    selectedCategory = params.get('category') ?? ''
    initialized = true
  })

  $effect(() => {
    const q = query
    const category = selectedCategory
    if (!initialized) return
    const params = new URLSearchParams(window.location.search)
    if (q.trim()) params.set('q', q.trim())
    else params.delete('q')
    if (category) params.set('category', category)
    else params.delete('category')
    const next = params.toString()
    history.replaceState(history.state, '', next ? `${window.location.pathname}?${next}` : window.location.pathname)
  })
</script>

<section class="project-section" aria-labelledby="projects-title">
  <div class="project-head">
    <div>
      <h1 id="projects-title">{tr('nav.projects')}</h1>
      <p>{filtered.length}</p>
    </div>
  </div>

  {#if items.length > 0}
    <div class="project-tools">
      <div class="project-search">
        <label class="project-sr" for="project-search">{tr('collections.search')}</label>
        <input id="project-search" type="search" placeholder={tr('collections.search')} bind:value={query} autocomplete="off" />
        {#if query}<button type="button" aria-label={tr('friends.close')} onclick={() => (query = '')}>×</button>{/if}
      </div>
      {#if categories.length > 1}
        <div class="project-chips" role="group" aria-label={tr('nav.projects')}>
          <button type="button" class:active={!selectedCategory} aria-pressed={!selectedCategory} onclick={() => (selectedCategory = '')}>{tr('collections.all')}</button>
          {#each categories as category (category)}<button type="button" class:active={selectedCategory === category} aria-pressed={selectedCategory === category} onclick={() => (selectedCategory = category)}>{category}</button>{/each}
        </div>
      {/if}
    </div>
  {/if}

  {#if filtered.length === 0}
    <div class="project-empty">{items.length === 0 ? tr('collections.empty') : tr('collections.noResults')}</div>
  {:else}
    <div class="project-grid">
      {#each filtered as item (item.id)}
        {@const image = cover(item)}
        {@const technologies = list(item.data, 'technologies').map(String)}
        {@const website = safeUrl(text(item.data, 'website'))}
        {@const repository = safeUrl(text(item.data, 'repository'))}
        {@const featured = item.data.featured === true || item.data.featured === 1}
        <article class="project-card" class:project-card--featured={featured}>
          {#if image}
            <div class="project-cover"><img src={image} alt="" loading="lazy" decoding="async" /></div>
          {/if}
          <div class="project-body">
            <div class="project-title-row">
              {#if !image}<span class="project-icon" aria-hidden="true">{initial(item.title)}</span>{/if}
              <div>
                <h2>{item.title}</h2>
                {#if text(item.data, 'year')}<span class="project-year">{text(item.data, 'year')}</span>{/if}
              </div>
              {#if featured}<span class="project-featured">{tr('common.pinned')}</span>{/if}
            </div>
            {#if text(item.data, 'phase')}<span class="project-phase">{text(item.data, 'phase')}</span>{/if}
            {#if text(item.data, 'summary')}<p class="project-summary">{text(item.data, 'summary')}</p>{/if}
            {#if technologies.length > 0}<div class="project-tech">{#each technologies as technology (technology)}<span>{technology}</span>{/each}</div>{/if}
            {#if website || repository}
              <div class="project-actions">
                {#if website}<a href={website} target="_blank" rel="noopener noreferrer">{tr('common.link')}</a>{/if}
                {#if repository}<a href={repository} target="_blank" rel="noopener noreferrer">{tr('common.repository')}</a>{/if}
              </div>
            {/if}
          </div>
        </article>
      {/each}
    </div>
  {/if}
</section>

<style>
  .project-section { display: flex; flex-direction: column; gap: 1rem; min-width: 0; }
  .project-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; }
  .project-head h1 { margin: 0; color: var(--on-surface); font-size: var(--text-30); line-height: 1.2; letter-spacing: -0.02em; }
  .project-head p { margin: 0; color: var(--on-surface-variant); font-size: var(--text-13); font-variant-numeric: tabular-nums; }
  .project-tools { display: flex; flex-direction: column; gap: 0.65rem; padding-bottom: 0.9rem; border-bottom: 1px solid var(--outline-variant); }
  .project-search { position: relative; width: min(100%, 30rem); }
  .project-search input { width: 100%; box-sizing: border-box; border: 1px solid var(--outline-variant); border-radius: var(--r-md); background: var(--bg-inset); color: var(--on-surface); padding: 0.5rem 2.2rem 0.5rem 0.85rem; font: inherit; font-size: var(--text-13); }
  .project-search button { position: absolute; right: 0.35rem; top: 50%; transform: translateY(-50%); width: 1.6rem; height: 1.6rem; border: 0; border-radius: var(--r-full); background: transparent; color: var(--on-surface-variant); cursor: pointer; font-size: var(--text-16); }
  .project-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
  .project-chips button { border: 1px solid var(--border-subtle); border-radius: var(--r-sm); background: transparent; color: var(--text-secondary); min-height: var(--btn-h-sm-compact); padding: 0 var(--sp-2-5); font: inherit; font-size: var(--text-11); cursor: pointer; }
  .project-chips button.active { background: var(--accent-soft); color: var(--accent-on-soft); border-color: transparent; }
  .project-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 19rem), 1fr)); gap: 0.85rem; align-items: start; }
  .project-card { display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--outline-variant); border-radius: var(--radius-lg); background: var(--card-bg, var(--surface-container-low)); }
  .project-card--featured { border-color: var(--primary); }
  .project-cover { aspect-ratio: 16 / 9; overflow: hidden; background: var(--surface-container); }
  .project-cover img { width: 100%; height: 100%; object-fit: cover; }
  .project-body { display: flex; flex-direction: column; gap: 0.35rem; padding: 0.8rem 0.9rem 0.95rem; min-width: 0; }
  .project-title-row { display: flex; align-items: flex-start; gap: 0.5rem; min-width: 0; }
  .project-icon { display: grid; place-items: center; width: 2.5rem; height: 2.5rem; flex: none; border-radius: var(--radius-sm); background: var(--surface-container); color: var(--on-surface); font-size: var(--text-14-5); font-weight: 700; }
  .project-title-row > div { min-width: 0; flex: 1; }
  .project-title-row h2 { margin: 0; color: var(--on-surface); font-size: var(--text-15); line-height: 1.35; }
  .project-year { color: var(--on-surface-variant); font-size: var(--text-10); }
  .project-featured { flex: none; border-radius: var(--r-full); background: var(--warning-soft); color: var(--warning); padding: 0.05rem 0.35rem; font-size: var(--text-10); }
  .project-phase { align-self: flex-start; border-radius: var(--r-full); background: var(--surface-container); color: var(--primary); padding: 0.1rem 0.5rem; font-size: var(--text-10); }
  .project-summary { margin: 0; color: var(--on-surface-variant); font-size: var(--text-12); line-height: 1.55; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .project-tech { display: flex; flex-wrap: wrap; gap: 0.3rem; color: var(--on-surface-variant); font-size: var(--text-10-5); }
  .project-tech span { border: 1px solid var(--outline-variant); border-radius: var(--r-full); padding: 0.1rem 0.4rem; }
  .project-actions { display: flex; gap: 0.45rem; margin-top: 0.1rem; }
  .project-actions a { color: var(--primary); font-size: var(--text-11); text-decoration: none; }
  .project-actions a:hover { text-decoration: underline; }
  .project-empty { padding: 3rem 1rem; text-align: center; color: var(--on-surface-variant); border: 1px dashed var(--outline-variant); border-radius: var(--radius-lg); font-size: var(--text-13); }
  .project-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
</style>
