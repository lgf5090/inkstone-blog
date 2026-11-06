<script lang="ts">
  import { onMount } from 'svelte'
  import type { BlogLocale } from '../../i18n'
  import { translator, type ClientMessages } from '../../i18n/client'
  import type { BlogCollectionItem } from '../../lib/blog-types'

  let { albums, locale, messages }: { albums: BlogCollectionItem[]; locale: BlogLocale; messages: ClientMessages } = $props()
  const tr = $derived(translator(messages))

  const text = (data: Record<string, unknown>, key: string): string =>
    typeof data[key] === 'string' ? data[key] as string : ''
  const list = (data: Record<string, unknown>, key: string): unknown[] =>
    Array.isArray(data[key]) ? data[key] as unknown[] : []
  const cover = (item: BlogCollectionItem): string | null => {
    const value = item.data.cover_asset_id
    return typeof value === 'string' && value ? `/_blog/media/${value}` : null
  }
  const tags = $derived(Array.from(new Set(albums.flatMap((item) => list(item.data, 'tags').map(String)))).sort())
  let query = $state('')
  let selectedTag = $state('')
  let initialized = $state(false)
  const filtered = $derived(albums.filter((item) => {
    if (selectedTag && !list(item.data, 'tags').map(String).includes(selectedTag)) return false
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    return [item.title, text(item.data, 'description'), text(item.data, 'location'), ...list(item.data, 'tags').map(String)]
      .join(' ')
      .toLowerCase()
      .includes(needle)
  }))

  function href(item: BlogCollectionItem): string {
    return `/albums/${encodeURIComponent(item.slug)}`
  }

  onMount(() => {
    const params = new URLSearchParams(window.location.search)
    query = params.get('q') ?? ''
    selectedTag = params.get('albumTag') ?? ''
    initialized = true
  })

  $effect(() => {
    const q = query
    const tag = selectedTag
    if (!initialized) return
    const params = new URLSearchParams(window.location.search)
    if (q.trim()) params.set('q', q.trim())
    else params.delete('q')
    if (tag) params.set('albumTag', tag)
    else params.delete('albumTag')
    const next = params.toString()
    history.replaceState(history.state, '', next ? `${window.location.pathname}?${next}` : window.location.pathname)
  })
</script>

<section class="album-section" aria-labelledby="albums-title">
  <div class="album-head">
    <div>
      <h1 id="albums-title">{tr('nav.albums')}</h1>
      <p>{filtered.length}</p>
    </div>
  </div>

  {#if albums.length > 0}
    <div class="album-tools">
      <div class="album-search">
        <label class="album-sr" for="album-search">{tr('collections.search')}</label>
        <input id="album-search" type="search" placeholder={tr('collections.search')} bind:value={query} autocomplete="off" />
        {#if query}<button type="button" aria-label={tr('friends.close')} onclick={() => (query = '')}>×</button>{/if}
      </div>
      {#if tags.length > 0}
        <div class="album-chips" role="group" aria-label={tr('common.tags')}>
          <button type="button" class:active={!selectedTag} aria-pressed={!selectedTag} onclick={() => (selectedTag = '')}>{tr('collections.all')}</button>
          {#each tags as tag (tag)}<button type="button" class:active={selectedTag === tag} aria-pressed={selectedTag === tag} onclick={() => (selectedTag = tag)}>{tag}</button>{/each}
        </div>
      {/if}
    </div>
  {/if}

  {#if filtered.length === 0}
    <div class="album-empty">{albums.length === 0 ? tr('collections.empty') : tr('collections.noResults')}</div>
  {:else}
    <div class="album-grid">
      {#each filtered as album (album.id)}
        {@const image = cover(album)}
        {@const albumTags = list(album.data, 'tags').map(String)}
        {@const locked = album.data.locked === true}
        <article class="album-card">
          <a class="album-card__link" href={href(album)}>
            <div class="album-card__cover">
              {#if image}<img src={image} alt="" loading="lazy" />{:else}<span aria-hidden="true">▦</span>{/if}
              {#if locked}<span class="album-card__lock">{tr('albums.protected')}</span>{/if}
            </div>
            <div class="album-card__body">
              <div class="album-card__title"><h2>{album.title}</h2><span aria-hidden="true">→</span></div>
              {#if text(album.data, 'description')}<p>{text(album.data, 'description')}</p>{/if}
              <div class="album-card__meta">
                {#if text(album.data, 'date')}<span>{text(album.data, 'date')}</span>{/if}
                {#if text(album.data, 'location')}<span>{text(album.data, 'location')}</span>{/if}
                <span>{String(album.data.photoCount ?? 0)} {tr('common.photos')}</span>
              </div>
              {#if albumTags.length > 0}
                <div class="album-card__tags">{#each albumTags.slice(0, 4) as tag (tag)}<span>#{tag}</span>{/each}</div>
              {/if}
            </div>
          </a>
        </article>
      {/each}
    </div>
  {/if}
</section>

<style>
  .album-section { display: flex; flex-direction: column; gap: 1rem; min-width: 0; }
  .album-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; }
  .album-head h1 { margin: 0; color: var(--on-surface); font-size: var(--text-30); line-height: 1.2; letter-spacing: -0.02em; }
  .album-head p { margin: 0; color: var(--on-surface-variant); font-size: var(--text-13); font-variant-numeric: tabular-nums; }
  .album-tools { display: flex; flex-direction: column; gap: 0.65rem; padding-bottom: 0.9rem; border-bottom: 1px solid var(--outline-variant); }
  .album-search { position: relative; width: min(100%, 30rem); }
  .album-search input { width: 100%; box-sizing: border-box; border: 1px solid var(--outline-variant); border-radius: var(--r-md); background: var(--bg-inset); color: var(--on-surface); padding: 0.5rem 2.2rem 0.5rem 0.85rem; font: inherit; font-size: var(--text-13); }
  .album-search button { position: absolute; right: 0.35rem; top: 50%; transform: translateY(-50%); width: 1.6rem; height: 1.6rem; border: 0; border-radius: var(--r-full); background: transparent; color: var(--on-surface-variant); cursor: pointer; font-size: var(--text-16); }
  .album-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
  .album-chips button { border: 1px solid var(--border-subtle); border-radius: var(--r-sm); background: transparent; color: var(--text-secondary); min-height: var(--btn-h-sm-compact); padding: 0 var(--sp-2-5); font: inherit; font-size: var(--text-11); cursor: pointer; }
  .album-chips button.active { background: var(--accent-soft); color: var(--accent-on-soft); border-color: transparent; }
  .album-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 17rem), 1fr)); gap: 0.8rem; }
  .album-card { min-width: 0; border: 1px solid var(--outline-variant); border-radius: var(--radius-lg); overflow: hidden; background: var(--card-bg); transition: transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out); }
  .album-card:hover { transform: translateY(-1px); box-shadow: var(--shadow-soft); }
  .album-card__link { display: flex; flex-direction: column; height: 100%; color: inherit; text-decoration: none; }
  .album-card__cover { position: relative; aspect-ratio: 16 / 10; display: grid; place-items: center; overflow: hidden; background: var(--surface-container); color: var(--on-surface-variant); font-size: var(--text-26); }
  .album-card__lock { position: absolute; left: 0.5rem; top: 0.5rem; border-radius: var(--r-full); background: var(--media-control-hover); color: var(--media-text-strong); padding: 0.15rem 0.5rem; font-size: var(--text-10); }
  .album-card__cover img { width: 100%; height: 100%; object-fit: cover; }
  .album-card__body { display: flex; flex-direction: column; gap: 0.25rem; padding: 0.75rem 0.85rem 0.9rem; }
  .album-card__title { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
  .album-card__title h2 { margin: 0; font-size: var(--text-15); color: var(--on-surface); }
  .album-card__title span { color: var(--on-surface-variant); }
  .album-card__body p { margin: 0; color: var(--on-surface-variant); font-size: var(--text-12); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .album-card__meta { display: flex; flex-wrap: wrap; gap: 0.45rem; color: var(--on-surface-variant); font-size: var(--text-10); }
  .album-card__tags { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.15rem; color: var(--primary); font-size: var(--text-10); }
  .album-empty { padding: 3rem 1rem; text-align: center; color: var(--on-surface-variant); border: 1px dashed var(--outline-variant); border-radius: var(--radius-lg); font-size: var(--text-13); }
  .album-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
</style>
