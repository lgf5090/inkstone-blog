<script lang="ts">
  import { onMount } from 'svelte'
  import { t, type BlogLocale } from '../../i18n'
  import type { BlogCollectionItem } from '../../lib/blog-types'

  type Kind = 'skills' | 'devices' | 'games' | 'anime'
  let { kind, items, locale }: { kind: Kind; items: BlogCollectionItem[]; locale: BlogLocale } = $props()

  const text = (data: Record<string, unknown>, key: string): string =>
    typeof data[key] === 'string' ? data[key] as string : ''
  const number = (data: Record<string, unknown>, key: string): number | null =>
    typeof data[key] === 'number' && Number.isFinite(data[key]) ? data[key] as number : null
  const list = (data: Record<string, unknown>, key: string): unknown[] =>
    Array.isArray(data[key]) ? data[key] as unknown[] : []
  const asset = (value: unknown): string | null => typeof value === 'string' && value ? `/_blog/media/${value}` : null
  const cover = (item: BlogCollectionItem): string | null => {
    const fromAsset = asset(item.data.cover_asset_id)
    if (fromAsset) return fromAsset
    const external = text(item.data, 'cover_url') || text(item.data, 'icon')
    return /^(https?:\/\/|\/)/i.test(external) ? external : null
  }
  const safeUrl = (value: string): string | null => /^https?:\/\//i.test(value) ? value : null
  const filterOf = (item: BlogCollectionItem): string => {
    if (kind === 'games' || kind === 'anime') return text(item.data, 'status')
    return text(item.data, 'category')
  }
  const filters = $derived(Array.from(new Set(items.map(filterOf).filter(Boolean))).sort())
  let query = $state('')
  let selectedFilter = $state('')
  let initialized = $state(false)
  const filtered = $derived(items.filter((item) => {
    if (selectedFilter && filterOf(item) !== selectedFilter) return false
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    return [
      item.title,
      text(item.data, 'description'),
      text(item.data, 'brand'),
      text(item.data, 'developer'),
      text(item.data, 'studio'),
      text(item.data, 'platform'),
      text(item.data, 'category'),
      text(item.data, 'status'),
      ...list(item.data, 'tags').map(String),
      ...list(item.data, 'genres').map(String),
      ...list(item.data, 'technologies').map(String),
    ].join(' ').toLowerCase().includes(needle)
  }))
  const titleKey = $derived(kind === 'skills' ? 'nav.skills' : kind === 'devices' ? 'nav.devices' : kind === 'games' ? 'nav.games' : 'nav.anime')

  function initial(value: string): string {
    return Array.from(value.trim())[0]?.toUpperCase() ?? '?'
  }

  function levelPercent(item: BlogCollectionItem): number | null {
    const level = number(item.data, 'level')
    if (level === null) return null
    return Math.min(100, Math.max(0, level <= 4 ? level * 25 : level))
  }

  function progress(watched: number | null, total: number | null): number | null {
    if (!watched || !total) return null
    return Math.min(100, Math.round((watched / total) * 100))
  }

  onMount(() => {
    const params = new URLSearchParams(window.location.search)
    query = params.get('q') ?? ''
    selectedFilter = params.get('filter') ?? ''
    initialized = true
  })

  $effect(() => {
    const q = query
    const filter = selectedFilter
    if (!initialized) return
    const params = new URLSearchParams(window.location.search)
    if (q.trim()) params.set('q', q.trim())
    else params.delete('q')
    if (filter) params.set('filter', filter)
    else params.delete('filter')
    const next = params.toString()
    history.replaceState(history.state, '', next ? `${window.location.pathname}?${next}` : window.location.pathname)
  })
</script>

<section class="grid-section" aria-labelledby="collection-title">
  <div class="grid-head">
    <div><h1 id="collection-title">{t(locale, titleKey)}</h1><p>{filtered.length}</p></div>
  </div>

  {#if items.length > 0}
    <div class="grid-tools">
      <div class="grid-search">
        <label class="grid-sr" for="collection-search">{t(locale, 'collections.search')}</label>
        <input id="collection-search" type="search" placeholder={t(locale, 'collections.search')} bind:value={query} autocomplete="off" />
        {#if query}<button type="button" aria-label={t(locale, 'friends.close')} onclick={() => (query = '')}>×</button>{/if}
      </div>
      {#if filters.length > 1}
        <div class="grid-chips" role="group" aria-label={t(locale, titleKey)}>
          <button type="button" class:active={!selectedFilter} aria-pressed={!selectedFilter} onclick={() => (selectedFilter = '')}>{t(locale, 'collections.all')}</button>
          {#each filters as filter (filter)}<button type="button" class:active={selectedFilter === filter} aria-pressed={selectedFilter === filter} onclick={() => (selectedFilter = filter)}>{filter}</button>{/each}
        </div>
      {/if}
    </div>
  {/if}

  {#if filtered.length === 0}
    <div class="grid-empty">{items.length === 0 ? t(locale, 'collections.empty') : t(locale, 'collections.noResults')}</div>
  {:else}
    <div class="grid-cards">
      {#each filtered as item (item.id)}
        {@const image = cover(item)}
        {@const tags = list(item.data, kind === 'anime' ? 'genres' : 'tags').map(String)}
        {@const link = safeUrl(text(item.data, 'link'))}
        {@const rating = number(item.data, 'rating')}
        {@const hours = number(item.data, 'hours')}
        {@const watched = number(item.data, 'watched')}
        {@const total = number(item.data, 'total')}
        {@const percent = progress(watched, total)}
        {@const level = levelPercent(item)}
        {@const specs = list(item.data, 'specs')}
        <article class="grid-card" class:grid-card--cover={Boolean(image)}>
          {#if image}<div class="grid-cover"><img src={image} alt="" loading="lazy" decoding="async" /></div>{/if}
          <div class="grid-body">
            <div class="grid-title-row">
              {#if !image && kind !== 'skills'}<span class="grid-icon" aria-hidden="true">{initial(item.title)}</span>{/if}
              <div class="grid-title-main">
                <h2>{item.title}</h2>
                {#if kind === 'skills'}<span class="grid-sub">{text(item.data, 'category')}</span>{/if}
                {#if kind === 'devices'}<span class="grid-sub">{[text(item.data, 'brand'), text(item.data, 'category'), text(item.data, 'status'), text(item.data, 'year')].filter(Boolean).join(' · ')}</span>{/if}
                {#if kind === 'games'}<span class="grid-sub">{[text(item.data, 'developer'), text(item.data, 'platform'), text(item.data, 'year'), text(item.data, 'status')].filter(Boolean).join(' · ')}</span>{/if}
                {#if kind === 'anime'}<span class="grid-sub">{[text(item.data, 'studio'), text(item.data, 'year'), text(item.data, 'status')].filter(Boolean).join(' · ')}</span>{/if}
              </div>
              {#if (kind === 'games' || kind === 'anime') && rating !== null}<span class="grid-rating">★ {rating}</span>{/if}
            </div>

            {#if kind === 'skills' && level !== null}
              <div class="grid-meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow={level} aria-label={item.title}><span style={`width:${level}%`}></span></div>
            {/if}
            {#if kind === 'skills' && text(item.data, 'description')}<p class="grid-desc">{text(item.data, 'description')}</p>{/if}
            {#if kind === 'devices' && specs.length > 0}
              <ul class="grid-specs">{#each specs as spec, i (i)}<li>{typeof spec === 'object' && spec ? `${String((spec as Record<string, unknown>).label ?? '')} ${String((spec as Record<string, unknown>).value ?? '')}` : String(spec)}</li>{/each}</ul>
            {/if}
            {#if kind === 'devices' && text(item.data, 'description')}<p class="grid-desc">{text(item.data, 'description')}</p>{/if}
            {#if kind === 'games' && hours !== null}<p class="grid-meta">{hours} h</p>{/if}
            {#if kind === 'games' && text(item.data, 'description')}<p class="grid-desc">{text(item.data, 'description')}</p>{/if}
            {#if kind === 'anime' && percent !== null}
              <div class="grid-meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent} aria-label={`${item.title}: ${watched}/${total}`}><span style={`width:${percent}%`}></span></div>
              <p class="grid-meta">{watched} / {total} {t(locale, 'common.episodes')}</p>
            {/if}
            {#if tags.length > 0}<div class="grid-tags">{#each tags as tag (tag)}<span>#{tag}</span>{/each}</div>{/if}
            {#if link}<a class="grid-link" href={link} target="_blank" rel="noopener noreferrer">{t(locale, 'common.link')}</a>{/if}
          </div>
        </article>
      {/each}
    </div>
  {/if}
</section>

<style>
  .grid-section { display: flex; flex-direction: column; gap: 1rem; min-width: 0; }
  .grid-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; }
  .grid-head h1 { margin: 0; color: var(--on-surface, #1d1b1e); font-size: 1.7rem; line-height: 1.2; letter-spacing: -0.02em; }
  .grid-head p { margin: 0; color: var(--on-surface-variant, #5d5b5e); font-size: 0.8rem; font-variant-numeric: tabular-nums; }
  .grid-tools { display: flex; flex-direction: column; gap: 0.65rem; padding-bottom: 0.9rem; border-bottom: 1px solid var(--outline-variant, rgba(0, 0, 0, 0.12)); }
  .grid-search { position: relative; width: min(100%, 30rem); }
  .grid-search input { width: 100%; box-sizing: border-box; border: 1px solid var(--outline-variant, rgba(0, 0, 0, 0.12)); border-radius: 999px; background: var(--surface-container-low, #f7f3f6); color: var(--on-surface, #1d1b1e); padding: 0.5rem 2.2rem 0.5rem 0.85rem; font: inherit; font-size: 0.8rem; }
  .grid-search button { position: absolute; right: 0.35rem; top: 50%; transform: translateY(-50%); width: 1.6rem; height: 1.6rem; border: 0; border-radius: 999px; background: transparent; color: var(--on-surface-variant, #5d5b5e); cursor: pointer; font-size: 1rem; }
  .grid-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
  .grid-chips button { border: 1px solid var(--outline-variant, rgba(0, 0, 0, 0.12)); border-radius: 999px; background: var(--surface-container-low, #f7f3f6); color: var(--on-surface-variant, #5d5b5e); padding: 0.25rem 0.65rem; font: inherit; font-size: 0.7rem; cursor: pointer; }
  .grid-chips button.active { background: var(--primary-container, #ffdada); color: var(--on-primary-container, #3a0000); border-color: transparent; }
  .grid-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr)); gap: 0.8rem; align-items: start; }
  .grid-card { display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--outline-variant, rgba(0, 0, 0, 0.12)); border-radius: 0.9rem; background: var(--card-bg, var(--surface-container-low, #f7f3f6)); }
  .grid-cover { aspect-ratio: 16 / 10; overflow: hidden; background: var(--surface-container, #f1edf0); }
  .grid-cover img { width: 100%; height: 100%; object-fit: cover; }
  .grid-body { display: flex; flex-direction: column; gap: 0.35rem; padding: 0.75rem 0.85rem 0.9rem; min-width: 0; }
  .grid-title-row { display: flex; align-items: flex-start; gap: 0.5rem; min-width: 0; }
  .grid-icon { display: grid; place-items: center; width: 2.2rem; height: 2.2rem; flex: none; border-radius: 0.5rem; background: var(--surface-container, #f1edf0); color: var(--on-surface, #1d1b1e); font-size: 0.85rem; font-weight: 700; }
  .grid-title-main { min-width: 0; flex: 1; }
  .grid-title-main h2 { margin: 0; color: var(--on-surface, #1d1b1e); font-size: 0.92rem; line-height: 1.35; }
  .grid-sub { display: block; color: var(--on-surface-variant, #5d5b5e); font-size: 0.66rem; line-height: 1.4; }
  .grid-rating { flex: none; color: var(--warning, #7a4d00); font-size: 0.7rem; }
  .grid-meter { height: 0.35rem; overflow: hidden; border-radius: 999px; background: var(--surface-container, #f1edf0); }
  .grid-meter span { display: block; height: 100%; border-radius: inherit; background: var(--primary, #8a3a3a); }
  .grid-desc { margin: 0; color: var(--on-surface-variant, #5d5b5e); font-size: 0.75rem; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .grid-specs { margin: 0; padding-left: 1rem; color: var(--on-surface-variant, #5d5b5e); font-size: 0.7rem; line-height: 1.5; }
  .grid-meta { margin: 0; color: var(--on-surface-variant, #5d5b5e); font-size: 0.68rem; }
  .grid-tags { display: flex; flex-wrap: wrap; gap: 0.3rem; color: var(--on-surface-variant, #5d5b5e); font-size: 0.64rem; }
  .grid-link { align-self: flex-start; color: var(--primary, #8a3a3a); font-size: 0.7rem; text-decoration: none; }
  .grid-link:hover { text-decoration: underline; }
  .grid-empty { padding: 3rem 1rem; text-align: center; color: var(--on-surface-variant, #5d5b5e); border: 1px dashed var(--outline-variant, rgba(0, 0, 0, 0.12)); border-radius: 0.9rem; font-size: 0.8rem; }
  .grid-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
</style>
