<script lang="ts">
  import { onMount } from 'svelte'
  import { t, type BlogLocale } from '../../i18n'
  import type { BlogCompassShelf } from '../../lib/blog-types'

  let { shelves, locale }: { shelves: BlogCompassShelf[]; locale: BlogLocale } = $props()

  let query = $state('')
  let selectedGroup = $state('')
  let initialized = $state(false)
  const groups = $derived(shelves.map((shelf) => ({ id: shelf.key, label: shelf.name })))
  const filtered = $derived(shelves
    .filter((shelf) => !selectedGroup || shelf.key === selectedGroup)
    .map((shelf) => ({
      ...shelf,
      entries: shelf.entries.filter((entry) => {
        const needle = query.trim().toLowerCase()
        if (!needle) return true
        return [entry.label, entry.note, entry.href, hostOf(entry.href)].join(' ').toLowerCase().includes(needle)
      }),
    }))
    .filter((shelf) => shelf.entries.length > 0))

  function hostOf(value: string): string {
    try { return new URL(value).hostname.replace(/^www\./, '') } catch { return value }
  }

  function iconSrc(entry: { icon: string; image: string }): string | null {
    const value = entry.image || entry.icon
    if (/^https?:\/\//i.test(value)) return value
    const asset = /^\/api\/blog\/assets\/([A-Za-z0-9_-]+)$/.exec(value)
    if (asset) return `/_blog/media/${asset[1]}`
    return value.startsWith('/') ? value : null
  }

  function safeUrl(value: string): string | null {
    return /^(https?:\/\/|\/)/i.test(value) ? value : null
  }

  onMount(() => {
    const params = new URLSearchParams(window.location.search)
    query = params.get('q') ?? ''
    selectedGroup = params.get('group') ?? ''
    initialized = true
  })

  $effect(() => {
    const q = query
    const group = selectedGroup
    if (!initialized) return
    const params = new URLSearchParams(window.location.search)
    if (q.trim()) params.set('q', q.trim())
    else params.delete('q')
    if (group) params.set('group', group)
    else params.delete('group')
    const next = params.toString()
    history.replaceState(history.state, '', next ? `${window.location.pathname}?${next}` : window.location.pathname)
  })
</script>

<section class="compass-section" aria-labelledby="compass-title">
  <div class="compass-head">
    <div><h1 id="compass-title">{t(locale, 'nav.compass')}</h1><p>{filtered.length}</p></div>
  </div>

  {#if shelves.length > 0}
    <div class="compass-tools">
      <div class="compass-search">
        <label class="compass-sr" for="compass-search">{t(locale, 'collections.search')}</label>
        <input id="compass-search" type="search" placeholder={t(locale, 'collections.search')} bind:value={query} autocomplete="off" />
        {#if query}<button type="button" aria-label={t(locale, 'friends.close')} onclick={() => (query = '')}>×</button>{/if}
      </div>
      {#if groups.length > 1}
        <div class="compass-chips" role="group" aria-label={t(locale, 'nav.compass')}>
          <button type="button" class:active={!selectedGroup} aria-pressed={!selectedGroup} onclick={() => (selectedGroup = '')}>{t(locale, 'collections.all')}</button>
          {#each groups as group (group.id)}<button type="button" class:active={selectedGroup === group.id} aria-pressed={selectedGroup === group.id} onclick={() => (selectedGroup = group.id)}>{group.label}</button>{/each}
        </div>
      {/if}
    </div>
  {/if}

  {#if filtered.length === 0}
    <div class="compass-empty">{shelves.length === 0 ? t(locale, 'collections.empty') : t(locale, 'collections.noResults')}</div>
  {:else}
    {#each filtered as shelf (shelf.id)}
      <section class="compass-shelf" aria-labelledby={`shelf-${shelf.id}`}>
        <div class="compass-shelf__head">
          <h2 id={`shelf-${shelf.id}`}>{shelf.name}</h2>
          {#if shelf.blurb}<p>{shelf.blurb}</p>{/if}
        </div>
        <div class="compass-grid">
          {#each shelf.entries as entry, index (entry.href + index)}
            {@const href = safeUrl(entry.href)}
            {@const icon = iconSrc(entry)}
            <article class="compass-tile">
              {#if href}
                <a href={href} target="_blank" rel="noopener noreferrer">
                  <span class="compass-icon">
                    {#if icon}<img src={icon} alt="" loading="lazy" />{:else}<span aria-hidden="true">{Array.from(entry.label)[0]?.toUpperCase() ?? '?'}</span>{/if}
                  </span>
                  <span class="compass-label">{entry.label}</span>
                  <span class="compass-note">{entry.note || hostOf(entry.href)}</span>
                </a>
              {/if}
            </article>
          {/each}
        </div>
      </section>
    {/each}
  {/if}
</section>

<style>
  .compass-section { display: flex; flex-direction: column; gap: 1rem; min-width: 0; }
  .compass-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; }
  .compass-head h1 { margin: 0; color: var(--on-surface, #1d1b1e); font-size: 1.7rem; line-height: 1.2; letter-spacing: -0.02em; }
  .compass-head p { margin: 0; color: var(--on-surface-variant, #5d5b5e); font-size: 0.8rem; font-variant-numeric: tabular-nums; }
  .compass-tools { display: flex; flex-direction: column; gap: 0.65rem; padding-bottom: 0.9rem; border-bottom: 1px solid var(--outline-variant, rgba(0, 0, 0, 0.12)); }
  .compass-search { position: relative; width: min(100%, 30rem); }
  .compass-search input { width: 100%; box-sizing: border-box; border: 1px solid var(--outline-variant, rgba(0, 0, 0, 0.12)); border-radius: 999px; background: var(--surface-container-low, #f7f3f6); color: var(--on-surface, #1d1b1e); padding: 0.5rem 2.2rem 0.5rem 0.85rem; font: inherit; font-size: 0.8rem; }
  .compass-search button { position: absolute; right: 0.35rem; top: 50%; transform: translateY(-50%); width: 1.6rem; height: 1.6rem; border: 0; border-radius: 999px; background: transparent; color: var(--on-surface-variant, #5d5b5e); cursor: pointer; font-size: 1rem; }
  .compass-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
  .compass-chips button { border: 1px solid var(--outline-variant, rgba(0, 0, 0, 0.12)); border-radius: 999px; background: var(--surface-container-low, #f7f3f6); color: var(--on-surface-variant, #5d5b5e); padding: 0.25rem 0.65rem; font: inherit; font-size: 0.7rem; cursor: pointer; }
  .compass-chips button.active { background: var(--primary-container, #ffdada); color: var(--on-primary-container, #3a0000); border-color: transparent; }
  .compass-shelf { display: flex; flex-direction: column; gap: 0.6rem; }
  .compass-shelf__head { display: flex; align-items: baseline; flex-wrap: wrap; gap: 0.6rem; }
  .compass-shelf__head h2 { margin: 0; color: var(--on-surface, #1d1b1e); font-size: 0.95rem; }
  .compass-shelf__head p { margin: 0; color: var(--on-surface-variant, #5d5b5e); font-size: 0.72rem; }
  .compass-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr)); gap: 0.55rem; }
  .compass-tile { min-width: 0; border: 1px solid var(--outline-variant, rgba(0, 0, 0, 0.12)); border-radius: 0.75rem; background: var(--card-bg, var(--surface-container-low, #f7f3f6)); }
  .compass-tile a { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; padding: 0.8rem 0.6rem; color: inherit; text-decoration: none; text-align: center; }
  .compass-tile a:hover { background: var(--surface-container, #f1edf0); }
  .compass-icon { display: grid; place-items: center; width: 2.6rem; height: 2.6rem; overflow: hidden; border-radius: 0.6rem; background: var(--surface-container, #f1edf0); color: var(--on-surface, #1d1b1e); font-size: 0.95rem; font-weight: 700; }
  .compass-icon img { width: 100%; height: 100%; object-fit: contain; }
  .compass-label { color: var(--on-surface, #1d1b1e); font-size: 0.78rem; font-weight: 600; }
  .compass-note { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--on-surface-variant, #5d5b5e); font-size: 0.66rem; }
  .compass-empty { padding: 3rem 1rem; text-align: center; color: var(--on-surface-variant, #5d5b5e); border: 1px dashed var(--outline-variant, rgba(0, 0, 0, 0.12)); border-radius: 0.9rem; font-size: 0.8rem; }
  .compass-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
</style>
