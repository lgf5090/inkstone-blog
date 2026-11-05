<script lang="ts">
  import { onMount } from 'svelte'
  import { t, type BlogLocale } from '../../i18n'
  import { formatDateTime } from '../../lib/format'
  import type { BlogCollectionItem } from '../../lib/blog-types'
  import PhotoLightbox from './PhotoLightbox.svelte'

  let { items, locale, timeZone, author }: {
    items: BlogCollectionItem[]
    locale: BlogLocale
    timeZone: string
    author: { name: string; avatar: string }
  } = $props()

  const PAGE_SIZE = 10
  const text = (data: Record<string, unknown>, key: string): string =>
    typeof data[key] === 'string' ? data[key] as string : ''
  const list = (data: Record<string, unknown>, key: string): unknown[] =>
    Array.isArray(data[key]) ? data[key] as unknown[] : []
  const asset = (value: string): string => {
    const match = /^\/api\/blog\/assets\/([A-Za-z0-9_-]+)$/.exec(value)
    if (match) return `/_blog/media/${match[1]}`
    if (/^[A-Za-z0-9_-]{16,}$/.test(value)) return `/_blog/media/${value}`
    return value
  }
  const images = (item: BlogCollectionItem): string[] =>
    list(item.data, 'images').flatMap((value) => typeof value === 'string' && value ? [asset(value)] : [])
  const tags = (item: BlogCollectionItem): string[] =>
    list(item.data, 'tags').map(String).filter(Boolean)
  const tagOptions = $derived(Array.from(new Set(items.flatMap(tags))).sort())
  let query = $state('')
  let selectedTag = $state('')
  let shown = $state(PAGE_SIZE)
  let initialized = $state(false)
  let lightbox = $state<{ photos: Array<{ src: string; alt: string; caption?: string }>; index: number } | null>(null)

  const filtered = $derived(items.filter((item) => {
    if (selectedTag && !tags(item).includes(selectedTag)) return false
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    return [item.title, text(item.data, 'content'), text(item.data, 'location'), ...tags(item)]
      .join(' ')
      .toLowerCase()
      .includes(needle)
  }))
  const visible = $derived(filtered.slice(0, shown))
  const authorInitial = $derived(Array.from(author.name.trim())[0]?.toUpperCase() ?? '?')
  const authorAvatar = $derived(author.avatar ? asset(author.avatar) : '')

  function openPhoto(item: BlogCollectionItem, index: number): void {
    lightbox = { photos: images(item).map((src, i) => ({ src, alt: `${item.title} ${i + 1}` })), index }
  }

  function more(): void {
    shown += PAGE_SIZE
  }

  onMount(() => {
    const params = new URLSearchParams(window.location.search)
    query = params.get('q') ?? ''
    selectedTag = params.get('tag') ?? ''
    initialized = true
  })

  $effect(() => {
    const q = query
    const tag = selectedTag
    if (!initialized) return
    shown = PAGE_SIZE
    const params = new URLSearchParams(window.location.search)
    if (q.trim()) params.set('q', q.trim())
    else params.delete('q')
    if (tag) params.set('tag', tag)
    else params.delete('tag')
    const next = params.toString()
    history.replaceState(history.state, '', next ? `${window.location.pathname}?${next}` : window.location.pathname)
  })
</script>

<section class="moment-section" aria-labelledby="moments-title">
  <div class="moment-head">
    <div>
      <h1 id="moments-title">{t(locale, 'nav.moments')}</h1>
      <p>{filtered.length}</p>
    </div>
  </div>

  {#if items.length > 0}
    <div class="moment-tools">
      <div class="moment-search">
        <label class="moment-sr" for="moment-search">{t(locale, 'collections.search')}</label>
        <input id="moment-search" type="search" placeholder={t(locale, 'collections.search')} bind:value={query} autocomplete="off" />
        {#if query}<button type="button" aria-label={t(locale, 'friends.close')} onclick={() => (query = '')}>×</button>{/if}
      </div>
      {#if tagOptions.length > 0}
        <div class="moment-chips" role="group" aria-label={t(locale, 'common.tags')}>
          <button type="button" class:active={!selectedTag} aria-pressed={!selectedTag} onclick={() => (selectedTag = '')}>{t(locale, 'collections.all')}</button>
          {#each tagOptions as tag (tag)}<button type="button" class:active={selectedTag === tag} aria-pressed={selectedTag === tag} onclick={() => (selectedTag = tag)}>#{tag}</button>{/each}
        </div>
      {/if}
    </div>
  {/if}

  {#if filtered.length === 0}
    <div class="moment-empty">{items.length === 0 ? t(locale, 'collections.empty') : t(locale, 'collections.noResults')}</div>
  {:else}
    <div class="moment-list">
      {#each visible as item (item.id)}
        {@const photos = images(item)}
        {@const mood = text(item.data, 'mood')}
        {@const location = text(item.data, 'location')}
        <article class="moment-card">
          <header class="moment-card__head">
            <span class="moment-avatar">
              {#if authorAvatar}<img src={authorAvatar} alt="" loading="lazy" />{:else}<span aria-hidden="true">{authorInitial}</span>{/if}
            </span>
            <span class="moment-author">{author.name}</span>
            {#if item.data.pinned === true || item.data.pinned === 1}<span class="moment-pin">{t(locale, 'common.pinned')}</span>{/if}
            {#if mood}<span class="moment-mood" aria-hidden="true">{mood}</span>{/if}
            {#if item.publishedAt}<time datetime={new Date(item.publishedAt).toISOString()}>{formatDateTime(item.publishedAt, locale, timeZone)}</time>{/if}
          </header>
          {#if text(item.data, 'content')}<p class="moment-content">{text(item.data, 'content')}</p>{/if}
          {#if photos.length > 0}
            <div class="moment-gallery" class:moment-gallery--many={photos.length > 1}>
              {#each photos.slice(0, 6) as photo, index (photo + index)}
                <button type="button" class="moment-photo" aria-label={`${t(locale, 'friends.open')} ${index + 1}`} onclick={() => openPhoto(item, index)}>
                  <img src={photo} alt="" loading="lazy" decoding="async" />
                  {#if photos.length > 6 && index === 5}<span class="moment-more">+{photos.length - 6}</span>{/if}
                </button>
              {/each}
            </div>
          {/if}
          {#if location || tags(item).length > 0}
            <footer class="moment-foot">
              {#if location}<span>{location}</span>{/if}
              {#each tags(item) as tag (tag)}<span>#{tag}</span>{/each}
            </footer>
          {/if}
        </article>
      {/each}
    </div>
    {#if filtered.length > shown}
      <div class="moment-more-row"><button type="button" class="moment-more-btn" onclick={more}>{t(locale, 'collections.loadMore')}</button></div>
    {/if}
  {/if}
</section>

{#if lightbox}
  <PhotoLightbox photos={lightbox.photos} index={lightbox.index} {locale} onclose={() => (lightbox = null)} />
{/if}

<style>
  .moment-section { display: flex; flex-direction: column; gap: 1rem; min-width: 0; }
  .moment-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; }
  .moment-head h1 { margin: 0; color: var(--on-surface); font-size: var(--text-30); line-height: 1.2; letter-spacing: -0.02em; }
  .moment-head p { margin: 0; color: var(--on-surface-variant); font-size: var(--text-13); font-variant-numeric: tabular-nums; }
  .moment-tools { display: flex; flex-direction: column; gap: 0.65rem; padding-bottom: 0.9rem; border-bottom: 1px solid var(--outline-variant); }
  .moment-search { position: relative; width: min(100%, 30rem); }
  .moment-search input { width: 100%; box-sizing: border-box; border: 1px solid var(--outline-variant); border-radius: var(--r-md); background: var(--bg-inset); color: var(--on-surface); padding: 0.5rem 2.2rem 0.5rem 0.85rem; font: inherit; font-size: var(--text-13); }
  .moment-search button { position: absolute; right: 0.35rem; top: 50%; transform: translateY(-50%); width: 1.6rem; height: 1.6rem; border: 0; border-radius: var(--r-full); background: transparent; color: var(--on-surface-variant); cursor: pointer; font-size: var(--text-16); }
  .moment-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
  .moment-chips button { border: 1px solid var(--border-subtle); border-radius: var(--r-sm); background: transparent; color: var(--text-secondary); min-height: var(--btn-h-sm-compact); padding: 0 var(--sp-2-5); font: inherit; font-size: var(--text-11); cursor: pointer; }
  .moment-chips button.active { background: var(--accent-soft); color: var(--accent-on-soft); border-color: transparent; }
  .moment-list { display: flex; flex-direction: column; gap: 0.85rem; }
  .moment-card { border: 1px solid var(--outline-variant); border-radius: var(--radius-lg); background: var(--card-bg, var(--surface-container-low)); padding: 0.9rem 1rem; }
  .moment-card__head { display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; color: var(--on-surface-variant); font-size: var(--text-11); }
  .moment-avatar { display: grid; place-items: center; width: 2rem; height: 2rem; overflow: hidden; border-radius: var(--r-full); background: var(--surface-container); color: var(--on-surface); font-size: var(--text-13); font-weight: 700; }
  .moment-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .moment-author { color: var(--on-surface); font-size: var(--text-12-5); font-weight: 600; }
  .moment-pin { border-radius: var(--r-full); background: var(--warning-soft); color: var(--warning); padding: 0.05rem 0.35rem; font-size: var(--text-10); }
  .moment-card__head time { margin-left: auto; }
  .moment-content { margin: 0.6rem 0; color: var(--on-surface); font-size: var(--text-13-5); line-height: 1.65; white-space: pre-wrap; overflow-wrap: anywhere; }
  .moment-gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); gap: 0.4rem; margin-top: 0.5rem; }
  .moment-gallery--many { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .moment-photo { position: relative; padding: 0; overflow: hidden; border: 1px solid var(--outline-variant); border-radius: var(--radius-md); background: var(--surface-container); cursor: zoom-in; }
  .moment-photo img { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
  .moment-more { position: absolute; inset: 0; display: grid; place-items: center; background: var(--media-control-hover); color: var(--media-text-strong); font-size: var(--text-16); font-weight: 700; }
  .moment-foot { display: flex; flex-wrap: wrap; gap: 0.45rem; margin-top: 0.5rem; color: var(--on-surface-variant); font-size: var(--text-11); }
  .moment-more-row { display: flex; justify-content: center; }
  .moment-more-btn { border: 1px solid var(--outline-variant); border-radius: var(--r-full); background: transparent; color: var(--primary); padding: 0.4rem 0.9rem; font: inherit; font-size: var(--text-12); cursor: pointer; }
  .moment-more-btn:hover { background: var(--surface-container); }
  .moment-empty { padding: 3rem 1rem; text-align: center; color: var(--on-surface-variant); border: 1px dashed var(--outline-variant); border-radius: var(--radius-lg); font-size: var(--text-13); }
  .moment-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
</style>
