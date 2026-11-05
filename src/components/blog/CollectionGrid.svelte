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
    <div class="grid-cards" data-kind={kind}>
      {#each filtered as item (item.id)}
        {@const image = cover(item)}
        {@const featured = item.data.featured === true || item.data.featured === 1}
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
          {#if image || kind === 'anime' || kind === 'games'}
            <div class="grid-cover" class:grid-cover--empty={!image}>
              {#if image}
                <img src={image} alt="" loading="lazy" decoding="async" />
              {:else}
                <span class="grid-cover-initial" aria-hidden="true">{initial(item.title)}</span>
              {/if}
              {#if (kind === 'games' || kind === 'anime') && rating !== null}<span class="grid-badge grid-badge--rating">★ {rating}</span>{/if}
              {#if (kind === 'games' || kind === 'anime') && text(item.data, 'status')}<span class="grid-badge grid-badge--status">{text(item.data, 'status')}</span>{/if}
              {#if featured}<span class="grid-badge grid-badge--featured">{t(locale, 'common.pinned')}</span>{/if}
            </div>
          {/if}
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
  .grid-head h1 { margin: 0; color: var(--on-surface); font-size: var(--text-30); line-height: 1.2; letter-spacing: -0.02em; }
  .grid-head p { margin: 0; color: var(--on-surface-variant); font-size: var(--text-13); font-variant-numeric: tabular-nums; }
  .grid-tools { display: flex; flex-direction: column; gap: 0.65rem; padding-bottom: 0.9rem; border-bottom: 1px solid var(--outline-variant); }
  .grid-search { position: relative; width: min(100%, 30rem); }
  .grid-search input { width: 100%; box-sizing: border-box; border: 1px solid var(--border-default); border-radius: var(--r-md); background: var(--bg-inset); color: var(--on-surface); padding: 0.55rem 2.2rem 0.55rem 0.9rem; font: inherit; font-size: var(--text-13); }
  .grid-search button { position: absolute; right: 0.4rem; top: 50%; transform: translateY(-50%); width: 1.6rem; height: 1.6rem; border: 0; border-radius: var(--r-full); background: transparent; color: var(--on-surface-variant); cursor: pointer; font-size: var(--text-16); }
  .grid-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
  .grid-chips button { border: 1px solid var(--border-subtle); border-radius: var(--r-sm); background: transparent; color: var(--text-secondary); min-height: var(--btn-h-sm-compact); padding: 0 var(--sp-3); font: inherit; font-size: var(--text-11-5); cursor: pointer; }
  .grid-chips button:hover { background: var(--surface-container); color: var(--on-surface); }
  .grid-chips button.active { background: var(--accent-soft); color: var(--accent-on-soft); border-color: transparent; }
  .grid-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr)); gap: 0.9rem; align-items: start; }
  .grid-card { display: flex; flex-direction: column; overflow: hidden; min-width: 0; border: 1px solid var(--outline-variant); border-radius: var(--radius-lg); background: var(--surface); transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease; }
  .grid-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-lift); border-color: color-mix(in oklab, var(--primary) 35%, var(--outline-variant)); }
  .grid-cover { position: relative; display: grid; place-items: center; overflow: hidden; background: var(--surface-container); }
  .grid-cards[data-kind='anime'] .grid-cover { aspect-ratio: 2 / 3; }
  .grid-cards[data-kind='games'] .grid-cover { aspect-ratio: 16 / 9; }
  .grid-cards[data-kind='devices'] .grid-cover, .grid-cards[data-kind='skills'] .grid-cover { aspect-ratio: 16 / 9; }
  .grid-cover img { width: 100%; height: 100%; object-fit: cover; }
  .grid-cover--empty { background: linear-gradient(135deg, color-mix(in oklab, var(--primary) 18%, var(--surface-container)), color-mix(in oklab, var(--secondary) 16%, var(--surface-container))); }
  .grid-cover-initial { color: var(--on-primary-container); font-size: 2rem; font-weight: 750; opacity: 0.75; }
  .grid-badge { position: absolute; display: inline-flex; align-items: center; gap: 0.2rem; border-radius: var(--r-full); background: color-mix(in oklab, var(--surface) 88%, transparent); color: var(--on-surface); padding: 0.18rem 0.5rem; font-size: var(--text-10); font-weight: 600; backdrop-filter: blur(6px); }
  .grid-badge--rating { top: 0.5rem; right: 0.5rem; color: var(--warning); }
  .grid-badge--status { top: 0.5rem; left: 0.5rem; color: var(--primary); }
  .grid-badge--featured { top: 0.5rem; left: 0.5rem; color: var(--on-primary-container); background: var(--primary-container); }
  .grid-body { display: flex; flex-direction: column; gap: 0.4rem; padding: 0.8rem 0.9rem 0.95rem; min-width: 0; }
  .grid-title-row { display: flex; align-items: flex-start; gap: 0.5rem; min-width: 0; }
  .grid-title-main { min-width: 0; flex: 1; }
  .grid-title-row h2 { margin: 0; color: var(--on-surface); font-size: var(--text-15); line-height: 1.35; }
  .grid-sub { display: block; margin-top: 0.1rem; color: var(--on-surface-variant); font-size: var(--text-11); }
  .grid-icon { display: grid; place-items: center; width: 2.4rem; height: 2.4rem; flex: none; border-radius: var(--radius-sm); background: var(--surface-container); color: var(--on-surface); font-size: var(--text-14-5); font-weight: 700; }
  .grid-desc { margin: 0; color: var(--on-surface-variant); font-size: var(--text-12); line-height: 1.55; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .grid-meta { margin: 0; color: var(--on-surface-variant); font-size: var(--text-11); }
  .grid-specs { display: flex; flex-wrap: wrap; gap: 0.3rem; margin: 0; padding: 0; list-style: none; color: var(--on-surface-variant); font-size: var(--text-11); }
  .grid-specs li { border: 1px solid var(--outline-variant); border-radius: var(--r-full); padding: 0.1rem 0.45rem; }
  .grid-meter { height: 0.4rem; overflow: hidden; border-radius: var(--r-full); background: var(--surface-container); }
  .grid-meter span { display: block; height: 100%; border-radius: inherit; background: var(--primary); }
  .grid-tags { display: flex; flex-wrap: wrap; gap: 0.25rem; color: var(--on-surface-variant); font-size: var(--text-11); }
  .grid-tags span { border: 1px solid var(--outline-variant); border-radius: var(--r-full); padding: 0.08rem 0.4rem; }
  .grid-link { align-self: flex-start; margin-top: 0.15rem; color: var(--primary); font-size: var(--text-11-5); }
  .grid-empty { padding: 3rem 1rem; text-align: center; color: var(--on-surface-variant); border: 1px dashed var(--outline-variant); border-radius: var(--radius-lg); font-size: var(--text-13); }
  .grid-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
</style>
