<script lang="ts">
  import { onMount, tick } from 'svelte'
  import { t, type BlogLocale } from '../../i18n'
  import type { BlogFriendCategory, BlogFriendLink, BlogFriends } from '../../lib/blog-types'

  let { friends, locale }: { friends: BlogFriends; locale: BlogLocale } = $props()

  let query = $state('')
  let selected = $state('')
  let collapsed = $state<Set<string>>(new Set())
  let menu = $state<{ x: number; y: number; link: BlogFriendLink } | null>(null)
  let menuEl = $state<HTMLDivElement | null>(null)
  let failedIcons = $state<Set<string>>(new Set())
  let copied = $state('')
  let initialized = $state(false)
  let applyOpen = $state(false)
  let applyBusy = $state(false)
  let applyDone = $state(false)
  let applyError = $state('')
  let name = $state('')
  let url = $state('')
  let description = $state('')
  let icon = $state('')
  let website = $state('')
  let applyButton = $state<HTMLButtonElement | null>(null)
  let dialogEl = $state<HTMLDivElement | null>(null)
  let nameInput = $state<HTMLInputElement | null>(null)
  // The page data is passed once per SSR render; local state starts from the owner's nav view.
  // svelte-ignore state_referenced_locally
  let cardStyle = $state<'detailed' | 'simple'>(friends.cardStyle)
  // svelte-ignore state_referenced_locally
  let searchMode = $state<'internal' | 'external'>(friends.search.mode)
  // svelte-ignore state_referenced_locally
  let sourceId = $state(friends.search.sources[0]?.id ?? '')
  let categoryFilter = $state('')
  let qrLink = $state<BlogFriendLink | null>(null)
  let qrDialog = $state<HTMLDivElement | null>(null)
  let iconBusy = $state(false)
  let iconError = $state('')
  let iconPreviewFailed = $state(false)

  const root = $derived(friends.categories.find((category) => category.id === friends.rootId) ?? null)
  const byId = $derived(new Map(friends.categories.map((category) => [category.id, category])))
  const childrenOf = (parentId: string) => friends.categories
    .filter((category) => category.parentId === parentId)
    .sort((a, b) => a.name.localeCompare(b.name))

  function descendants(id: string): string[] {
    const out = [id]
    for (const child of childrenOf(id)) out.push(...descendants(child.id))
    return out
  }

  function idsFor(id: string): Set<string> {
    return new Set(id ? descendants(id) : friends.categories.map((category) => category.id))
  }

  function countFor(id: string): number {
    const ids = idsFor(id)
    return friends.links.filter((link) => ids.has(link.categoryId)).length
  }

  function flatten(node: BlogFriendCategory, depth: number, ignoreCollapse = false): Array<BlogFriendCategory & { depth: number }> {
    const out: Array<BlogFriendCategory & { depth: number }> = [{ ...node, depth }]
    if (ignoreCollapse || !collapsed.has(node.id)) {
      for (const child of childrenOf(node.id)) out.push(...flatten(child, depth + 1, ignoreCollapse))
    }
    return out
  }

  function categoryMatches(node: BlogFriendCategory): boolean {
    const filter = categoryFilter.trim().toLowerCase()
    if (!filter) return true
    return node.name.toLowerCase().includes(filter) || childrenOf(node.id).some(categoryMatches)
  }

  const visibleTree = $derived(root ? flatten(root, 0, Boolean(categoryFilter.trim())).filter(categoryMatches) : [])
  const collapsible = $derived(friends.categories.filter((category) => childrenOf(category.id).length > 0).map((category) => category.id))
  const allCollapsed = $derived(collapsible.length > 0 && collapsible.every((id) => collapsed.has(id)))
  const selectedIds = $derived(idsFor(selected))
  const needle = $derived(query.trim().toLowerCase())
  const filtered = $derived(friends.links.filter((link) => {
    if (!selectedIds.has(link.categoryId)) return false
    if (searchMode === 'external' || !needle) return true
    const host = hostOf(link.url)
    return [link.title, link.description, link.url, host, byId.get(link.categoryId)?.name ?? '']
      .some((value) => value.toLowerCase().includes(needle))
  }))

  function toggleCollapse(id: string): void {
    const next = new Set(collapsed)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    collapsed = next
  }

  function toggleAllCategories(): void {
    collapsed = allCollapsed ? new Set() : new Set(collapsible)
  }

  function submitSearch(event: SubmitEvent): void {
    event.preventDefault()
    if (searchMode !== 'external' || !query.trim()) return
    const source = friends.search.sources.find((entry) => entry.id === sourceId)
    if (!source) return
    window.open(source.url.replaceAll('{query}', encodeURIComponent(query.trim())), '_blank', 'noopener,noreferrer')
  }

  function toggleCardStyle(): void {
    cardStyle = cardStyle === 'detailed' ? 'simple' : 'detailed'
  }

  function hostOf(value: string): string {
    try { return new URL(value).hostname.replace(/^www\./, '') } catch { return value }
  }

  function iconSrc(value: string | null): string | null {
    if (!value) return null
    const match = /^\/api\/blog\/assets\/([A-Za-z0-9_-]+)$/.exec(value)
    return match ? `/_blog/media/${match[1]}` : value
  }

  function initial(value: string): string {
    return Array.from(value.trim())[0]?.toUpperCase() ?? '?'
  }

  function tint(value: string): number {
    let hue = 0
    for (const char of value) hue = (hue * 31 + (char.codePointAt(0) ?? 0)) % 360
    return hue
  }

  function markFailed(id: string): void {
    const next = new Set(failedIcons)
    next.add(id)
    failedIcons = next
  }

  async function copy(value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value)
      copied = t(locale, 'common.copied')
    } catch {
      copied = t(locale, 'common.copyFailed')
    }
    window.setTimeout(() => { copied = '' }, 1600)
  }

  async function openMenu(event: MouseEvent, link: BlogFriendLink): Promise<void> {
    event.preventDefault()
    menu = {
      x: Math.min(event.clientX, window.innerWidth - 214),
      y: Math.min(event.clientY, window.innerHeight - 230),
      link,
    }
    await tick()
    menuEl?.querySelector<HTMLButtonElement>('button')?.focus()
  }

  function closeMenu(): void {
    menu = null
  }

  function menuKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeMenu()
      return
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const buttons = [...(menuEl?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
    buttons[event.key === 'ArrowDown' ? (index + 1) % buttons.length : (index - 1 + buttons.length) % buttons.length]?.focus()
  }

  $effect(() => {
    if (!menu) return
    const onDown = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('.friend-menu')) closeMenu()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  })

  function openApply(): void {
    applyDone = false
    applyError = ''
    iconError = ''
    iconPreviewFailed = false
    applyOpen = true
    void tick().then(() => nameInput?.focus())
  }

  function closeApply(): void {
    applyOpen = false
    applyButton?.focus()
  }

  $effect(() => {
    if (!applyOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeApply()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  function trapFocus(event: KeyboardEvent, container: HTMLElement | null = dialogEl): void {
    if (event.key !== 'Tab' || !container) return
    const focusable = [...container.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex]:not([tabindex="-1"])')]
      .filter((node) => node.offsetParent !== null || node === document.activeElement)
    if (focusable.length === 0) return
    const first = focusable[0]!
    const last = focusable[focusable.length - 1]!
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    }
  }

  async function submitApply(event: SubmitEvent): Promise<void> {
    event.preventDefault()
    if (applyBusy) return
    applyBusy = true
    applyError = ''
    try {
      const response = await fetch('/api/blog/friends/apply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: name, url, description, icon, website }),
      })
      if (!response.ok) throw new Error('apply_failed')
      applyDone = true
      name = ''
      url = ''
      description = ''
      icon = ''
      website = ''
      iconPreviewFailed = false
      iconError = ''
    } catch {
      applyError = t(locale, 'friends.error')
    } finally {
      applyBusy = false
    }
  }

  function qrSource(link: BlogFriendLink): string {
    return `/api/blog/friends/qr?url=${encodeURIComponent(link.url)}`
  }

  function openQr(link: BlogFriendLink): void {
    qrLink = link
    void tick().then(() => qrDialog?.querySelector<HTMLButtonElement>('button')?.focus())
  }

  function closeQr(): void {
    qrLink = null
  }

  $effect(() => {
    if (!qrLink) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeQr()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  async function fetchIcon(): Promise<void> {
    if (!url.trim() || iconBusy) return
    iconError = ''
    let target: URL
    try {
      target = new URL(url)
      if (target.protocol !== 'http:' && target.protocol !== 'https:') throw new Error('scheme')
    } catch {
      iconError = t(locale, 'friends.iconFetchFailed')
      return
    }
    // Fill the conventional favicon immediately; the guarded server read may refine it.
    icon = new URL('/favicon.ico', target).toString()
    iconPreviewFailed = false
    iconBusy = true
    try {
      const response = await fetch('/api/blog/friends/icon', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const body = await response.json().catch(() => null) as { icon?: unknown } | null
      if (response.ok && typeof body?.icon === 'string') {
        icon = body.icon
        iconPreviewFailed = false
      }
    } catch {
      // The conventional favicon already filled in; a failed refinement is not a form error.
    } finally {
      iconBusy = false
    }
  }

  onMount(() => {
    const params = new URLSearchParams(window.location.search)
    query = params.get('q') ?? ''
    const category = params.get('category') ?? ''
    if (category && friends.categories.some((entry) => entry.id === category)) selected = category
    initialized = true
  })

  $effect(() => {
    const q = query
    const category = selected
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

<section class="friend-section" aria-labelledby="friends-title">
  <div class="friend-toolbar">
    <div class="friend-toolbar__heading">
      <h1 id="friends-title" class="friend-title">{t(locale, 'nav.friends')}</h1>
      <span class="friend-count">{filtered.length}</span>
    </div>
    <div class="friend-toolbar__actions">
      <button type="button" class="friend-view" aria-pressed={cardStyle === 'simple'} onclick={toggleCardStyle}>
        {cardStyle === 'detailed' ? t(locale, 'friends.viewSimple') : t(locale, 'friends.viewDetailed')}
      </button>
      <button bind:this={applyButton} type="button" class="friend-apply" onclick={openApply}>{t(locale, 'friends.apply')}</button>
    </div>
  </div>

  <form class="friend-search-row" onsubmit={submitSearch}>
    <div class="friend-search-mode" role="group" aria-label={t(locale, 'friends.search')}>
      <button type="button" aria-pressed={searchMode === 'internal'} onclick={() => (searchMode = 'internal')}>{t(locale, 'friends.searchInternal')}</button>
      <button type="button" aria-pressed={searchMode === 'external'} disabled={friends.search.sources.length === 0} onclick={() => (searchMode = 'external')}>{t(locale, 'friends.searchExternal')}</button>
    </div>
    {#if searchMode === 'external'}
      <select class="friend-search-source" bind:value={sourceId} aria-label={t(locale, 'friends.engine')}>
        {#each friends.search.sources as source (source.id)}
          <option value={source.id}>{source.name}</option>
        {/each}
      </select>
    {/if}
    <div class="friend-search">
      <label class="friend-sr" for="friend-search-input">{t(locale, 'friends.search')}</label>
      <input id="friend-search-input" type="search" placeholder={t(locale, 'friends.search')} bind:value={query} autocomplete="off" />
      {#if query}
        <button type="button" class="friend-search__clear" aria-label={t(locale, 'friends.close')} onclick={() => (query = '')}>×</button>
      {/if}
    </div>
  </form>

  <div class="friend-layout">
    <aside class="friend-tree" aria-label={t(locale, 'friends.categories')}>
      <div class="friend-tree__head">
        <span>{t(locale, 'friends.categories')}</span>
        {#if collapsible.length > 0}
          <button
            type="button"
            class="friend-tree__toggle"
            aria-label={allCollapsed ? t(locale, 'common.tocUnfold') : t(locale, 'common.tocFold')}
            onclick={toggleAllCategories}
          >{allCollapsed ? '▸' : '▾'}</button>
        {/if}
      </div>
      <input
        class="friend-tree__filter"
        type="search"
        placeholder={t(locale, 'friends.filterCategories')}
        aria-label={t(locale, 'friends.filterCategories')}
        bind:value={categoryFilter}
        autocomplete="off"
      />
      <button
        type="button"
        class="friend-cat friend-cat--all"
        class:active={selected === ''}
        aria-current={selected === '' ? 'true' : undefined}
        onclick={() => (selected = '')}
      >
        <span class="friend-cat__spacer" aria-hidden="true"></span>
        <span class="friend-cat__select-inner"><span class="friend-cat__label">{t(locale, 'friends.all')}</span><span class="friend-cat__count">{friends.links.length}</span></span>
      </button>
      {#each visibleTree as category (category.id)}
        <div class="friend-cat" class:friend-cat--root={category.depth === 0} style={`--depth:${category.depth}`}>
          {#if childrenOf(category.id).length > 0}
            <button
              type="button"
              class="friend-cat__toggle"
              aria-expanded={!collapsed.has(category.id)}
              aria-label={collapsed.has(category.id) ? t(locale, 'common.tocUnfold') : t(locale, 'common.tocFold')}
              onclick={() => toggleCollapse(category.id)}
            >{collapsed.has(category.id) ? '▸' : '▾'}</button>
          {:else}
            <span class="friend-cat__spacer" aria-hidden="true"></span>
          {/if}
          <button
            type="button"
            class="friend-cat__select"
            class:active={selected === category.id}
            aria-current={selected === category.id ? 'true' : undefined}
            onclick={() => (selected = category.id)}
          >
            <span class="friend-cat__label">{category.name}</span>
            <span class="friend-cat__count">{countFor(category.id)}</span>
          </button>
        </div>
      {/each}
    </aside>

    <div class="friend-results">
      {#if friends.links.length === 0}
        <div class="friend-empty">{t(locale, 'collections.empty')}</div>
      {:else if filtered.length === 0}
        <div class="friend-empty">{t(locale, 'friends.empty')}</div>
      {:else}
        <div class="friend-grid">
          {#each filtered as link (link.id)}
            {@const source = iconSrc(link.icon)}
            <a
              class="friend-card"
              class:friend-card--simple={cardStyle === 'simple'}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${t(locale, 'friends.open')}: ${link.title}`}
              oncontextmenu={(event) => openMenu(event, link)}
            >
              <span class="friend-icon" style={`--friend-hue:${tint(link.title)}`}>
                {#if source && !failedIcons.has(link.id)}
                  <img src={source} alt="" loading="lazy" referrerpolicy="no-referrer" onerror={() => markFailed(link.id)} />
                {:else}
                  <span aria-hidden="true">{initial(link.title)}</span>
                {/if}
              </span>
              <span class="friend-card__body">
                <span class="friend-card__top">
                  <strong class="friend-card__title">{link.title}</strong>
                  {#if link.pinned}<span class="friend-pin">{t(locale, 'common.pinned')}</span>{/if}
                </span>
                {#if cardStyle === 'detailed'}
                  {#if link.description}<span class="friend-card__desc">{link.description}</span>{/if}
                  <span class="friend-card__url">{link.url}</span>
                {/if}
              </span>
            </a>
          {/each}
        </div>
      {/if}
    </div>
  </div>
  <span class="friend-sr" aria-live="polite">{copied}</span>
</section>

{#if menu}
  <div class="friend-menu" role="menu" tabindex="-1" bind:this={menuEl} style={`left:${menu.x}px;top:${menu.y}px`} onkeydown={menuKey}>
    <button type="button" role="menuitem" onclick={() => { window.open(menu!.link.url, '_blank', 'noopener,noreferrer'); closeMenu() }}><span class="friend-menu__icon" aria-hidden="true">↗</span>{t(locale, 'friends.open')}</button>
    <button type="button" role="menuitem" onclick={() => { void copy(menu!.link.url); closeMenu() }}><span class="friend-menu__icon" aria-hidden="true">⧉</span>{t(locale, 'friends.copyLink')}</button>
    <button type="button" role="menuitem" onclick={() => { openQr(menu!.link); closeMenu() }}><span class="friend-menu__icon" aria-hidden="true">▦</span>{t(locale, 'friends.qr')}</button>
    <button type="button" role="menuitem" onclick={() => { void copy(hostOf(menu!.link.url)); closeMenu() }}><span class="friend-menu__icon" aria-hidden="true">◈</span>{t(locale, 'friends.copyDomain')}</button>
    <button type="button" role="menuitem" onclick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); closeMenu() }}><span class="friend-menu__icon" aria-hidden="true">↑</span>{t(locale, 'runtime.backToTop')}</button>
  </div>
{/if}

{#if applyOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="friend-backdrop" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) closeApply() }}>
    <div class="friend-dialog" role="dialog" aria-modal="true" aria-labelledby="friend-dialog-title" tabindex="-1" bind:this={dialogEl} onkeydown={trapFocus}>
      <div class="friend-dialog__head">
        <h2 id="friend-dialog-title">{t(locale, 'friends.apply')}</h2>
        <button type="button" class="friend-dialog__close" aria-label={t(locale, 'friends.close')} onclick={closeApply}>×</button>
      </div>
      {#if applyDone}
        <p class="friend-dialog__success" role="status">{t(locale, 'friends.success')}</p>
        <div class="friend-dialog__actions">
          <button type="button" class="friend-submit" onclick={closeApply}>{t(locale, 'friends.close')}</button>
        </div>
      {:else}
        <p class="friend-dialog__hint">{t(locale, 'friends.applicationHint')}</p>
        <form class="friend-form" onsubmit={submitApply}>
          <label for="friend-name">{t(locale, 'friends.siteName')}</label>
          <input id="friend-name" bind:this={nameInput} bind:value={name} required maxlength="200" autocomplete="organization" />
          <label for="friend-url">{t(locale, 'friends.siteUrl')}</label>
          <input id="friend-url" bind:value={url} required type="url" maxlength="2048" placeholder="https://" autocomplete="url" />
          <label for="friend-description">{t(locale, 'friends.description')}</label>
          <textarea id="friend-description" bind:value={description} maxlength="500" rows="3"></textarea>
          <label for="friend-icon">{t(locale, 'friends.icon')}</label>
          <div class="friend-icon-field">
            <span class="friend-icon-preview" aria-hidden="true">
              {#if icon && !iconPreviewFailed}
                <img src={icon} alt="" referrerpolicy="no-referrer" onerror={() => (iconPreviewFailed = true)} />
              {:else}
                <span>{initial(name || '?')}</span>
              {/if}
            </span>
            <input id="friend-icon" bind:value={icon} oninput={() => { iconPreviewFailed = false; iconError = '' }} type="url" maxlength="2048" placeholder="https://" autocomplete="off" />
            <button type="button" class="friend-icon-fetch" onclick={() => void fetchIcon()} disabled={iconBusy || !url.trim()}>
              {iconBusy ? t(locale, 'friends.fetchingIcon') : t(locale, 'friends.fetchIcon')}
            </button>
          </div>
          {#if iconError}<p class="friend-dialog__error" role="alert">{iconError}</p>{/if}
          <div class="friend-honeypot" aria-hidden="true">
            <label for="friend-website">Website</label>
            <input id="friend-website" bind:value={website} tabindex="-1" autocomplete="off" />
          </div>
          {#if applyError}<p class="friend-dialog__error" role="alert">{applyError}</p>{/if}
          <div class="friend-dialog__actions">
            <button type="button" class="friend-cancel" onclick={closeApply}>{t(locale, 'comments.cancel')}</button>
            <button type="submit" class="friend-submit" disabled={applyBusy}>{applyBusy ? '…' : t(locale, 'friends.submit')}</button>
          </div>
        </form>
      {/if}
    </div>
  </div>
{/if}

{#if qrLink}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="friend-backdrop" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) closeQr() }}>
    <div class="friend-qr" role="dialog" aria-modal="true" aria-label={t(locale, 'friends.qr')} tabindex="-1" bind:this={qrDialog} onkeydown={(event) => trapFocus(event, qrDialog)}>
      <div class="friend-dialog__head">
        <h2>{t(locale, 'friends.qr')}</h2>
        <button type="button" class="friend-dialog__close" aria-label={t(locale, 'friends.close')} onclick={closeQr}>×</button>
      </div>
      <img class="friend-qr__image" src={qrSource(qrLink)} alt={t(locale, 'friends.qr')} width="240" height="240" />
      <p class="friend-qr__url">{qrLink.url}</p>
    </div>
  </div>
{/if}

<style>
  .friend-section { display: flex; flex-direction: column; gap: 0.9rem; min-width: 0; }
  .friend-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
  .friend-toolbar__heading { display: flex; align-items: baseline; gap: 0.6rem; min-width: 0; }
  .friend-title { margin: 0; color: var(--on-surface, #1d1b1e); font-size: 1.7rem; line-height: 1.2; letter-spacing: -0.02em; }
  .friend-count { color: var(--on-surface-variant, #5d5b5e); font-size: 0.8rem; font-variant-numeric: tabular-nums; }
  .friend-apply { border: 0; border-radius: 999px; background: var(--primary, #8a3a3a); color: var(--on-primary, #fff); padding: 0.45rem 0.95rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
  .friend-apply:hover { filter: brightness(1.06); }
  .friend-apply:focus-visible { outline: 2px solid var(--primary, #8a3a3a); outline-offset: 2px; }
  .friend-toolbar__actions { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .friend-view { border: 1px solid var(--outline-variant, rgba(0, 0, 0, 0.12)); border-radius: 999px; background: transparent; color: var(--on-surface-variant, #5d5b5e); padding: 0.4rem 0.8rem; font: inherit; font-size: 0.75rem; cursor: pointer; }
  .friend-view:hover { background: var(--surface-container, #f1edf0); color: var(--on-surface, #1d1b1e); }
  .friend-view:focus-visible { outline: 2px solid var(--primary, #8a3a3a); outline-offset: 2px; }
  .friend-search-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .friend-search-mode { display: inline-flex; padding: 0.15rem; border: 1px solid var(--outline-variant, rgba(0, 0, 0, 0.12)); border-radius: 999px; background: var(--surface-container-low, #f7f3f6); }
  .friend-search-mode button { border: 0; border-radius: 999px; background: transparent; color: var(--on-surface-variant, #5d5b5e); padding: 0.3rem 0.65rem; font: inherit; font-size: 0.72rem; cursor: pointer; }
  .friend-search-mode button[aria-pressed='true'] { background: var(--surface-container-high, #fff); color: var(--on-surface, #1d1b1e); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08); }
  .friend-search-mode button:disabled { opacity: 0.45; cursor: default; }
  .friend-search-source { border: 1px solid var(--outline-variant, rgba(0, 0, 0, 0.12)); border-radius: 999px; background: var(--surface-container-low, #f7f3f6); color: var(--on-surface, #1d1b1e); padding: 0.45rem 0.65rem; font: inherit; font-size: 0.72rem; }
  .friend-search { position: relative; display: flex; align-items: center; width: min(100%, 30rem); flex: 1 1 16rem; }
  .friend-search input { width: 100%; box-sizing: border-box; border: 1px solid var(--outline-variant, rgba(0, 0, 0, 0.12)); border-radius: 999px; background: var(--surface-container-low, #f7f3f6); color: var(--on-surface, #1d1b1e); padding: 0.55rem 2.4rem 0.55rem 0.9rem; font: inherit; font-size: 0.82rem; outline: none; }
  .friend-search input:focus-visible { outline: 2px solid var(--primary, #8a3a3a); outline-offset: 1px; }
  .friend-search__clear { position: absolute; right: 0.45rem; width: 1.7rem; height: 1.7rem; border: 0; border-radius: 999px; background: transparent; color: var(--on-surface-variant, #5d5b5e); cursor: pointer; font-size: 1rem; line-height: 1; }
  .friend-search__clear:hover { background: var(--surface-container, #f1edf0); }
  .friend-layout { display: grid; grid-template-columns: minmax(11rem, 14rem) minmax(0, 1fr); gap: 1.1rem; align-items: start; }
  .friend-tree { position: sticky; top: 1rem; display: flex; flex-direction: column; gap: 0.15rem; padding: 0.45rem; border: 1px solid var(--outline-variant, rgba(0, 0, 0, 0.12)); border-radius: 1rem; background: var(--card-bg, var(--surface-container-low, #f7f3f6)); max-height: calc(100dvh - 8rem); overflow: auto; }
  .friend-tree__head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.15rem 0.35rem; color: var(--on-surface-variant, #5d5b5e); font-size: 0.68rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
  .friend-tree__toggle { width: 1.5rem; height: 1.5rem; border: 0; border-radius: 0.35rem; background: transparent; color: var(--on-surface-variant, #5d5b5e); cursor: pointer; font-size: 0.7rem; }
  .friend-tree__toggle:hover { background: var(--surface-container, #f1edf0); }
  .friend-tree__filter { width: 100%; box-sizing: border-box; border: 1px solid var(--outline-variant, rgba(0, 0, 0, 0.12)); border-radius: 0.55rem; background: var(--surface-container-low, #f7f3f6); color: var(--on-surface, #1d1b1e); padding: 0.35rem 0.5rem; font: inherit; font-size: 0.72rem; margin-bottom: 0.2rem; }
  .friend-tree__filter:focus-visible { outline: 2px solid var(--primary, #8a3a3a); outline-offset: 1px; }
  .friend-cat { display: flex; align-items: center; gap: 0.1rem; min-width: 0; padding-left: calc(var(--depth, 0) * 0.75rem); }
  .friend-cat--root .friend-cat__select { color: var(--on-surface, #1d1b1e); font-weight: 600; }
  .friend-cat--all { width: 100%; border: 0; background: transparent; padding: 0.35rem 0.4rem; cursor: pointer; border-radius: 0.55rem; }
  .friend-cat--all:hover { background: var(--surface-container, #f1edf0); }
  .friend-cat--all.active { background: var(--primary-container, #ffdada); color: var(--on-primary-container, #3a0000); }
  .friend-cat__toggle { flex: none; width: 1.4rem; height: 1.7rem; border: 0; background: transparent; color: var(--on-surface-variant, #5d5b5e); cursor: pointer; border-radius: 0.35rem; font-size: 0.7rem; }
  .friend-cat__toggle:hover { background: var(--surface-container, #f1edf0); }
  .friend-cat__spacer { flex: none; width: 1.4rem; }
  .friend-cat__select { display: flex; align-items: center; gap: 0.5rem; min-width: 0; flex: 1; border: 0; background: transparent; color: var(--on-surface-variant, #5d5b5e); padding: 0.35rem 0.4rem; border-radius: 0.55rem; cursor: pointer; font: inherit; font-size: 0.78rem; text-align: left; }
  .friend-cat__select:hover { background: var(--surface-container, #f1edf0); color: var(--on-surface, #1d1b1e); }
  .friend-cat__select.active { background: var(--primary-container, #ffdada); color: var(--on-primary-container, #3a0000); }
  .friend-cat__select-inner { display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 0; color: inherit; font: inherit; }
  .friend-cat__label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .friend-cat__count { margin-left: auto; flex: none; font-size: 0.68rem; opacity: 0.7; font-variant-numeric: tabular-nums; }
  .friend-results { min-width: 0; }
  .friend-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr)); gap: 0.7rem; }
  .friend-card { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 0.65rem; align-items: start; padding: 0.75rem 0.8rem; border: 1px solid var(--outline-variant, rgba(0, 0, 0, 0.12)); border-radius: 0.75rem; background: var(--card-bg, var(--surface-container-low, #f7f3f6)); color: var(--on-surface, #1d1b1e); text-decoration: none; transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease; }
  .friend-card:hover { transform: translateY(-1px); border-color: var(--outline, rgba(0, 0, 0, 0.25)); box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08); }
  .friend-card:focus-visible { outline: 2px solid var(--primary, #8a3a3a); outline-offset: 2px; }
  .friend-icon { display: grid; place-items: center; width: 2.5rem; height: 2.5rem; border-radius: 0.55rem; overflow: hidden; background: color-mix(in oklab, hsl(var(--friend-hue, 20) 65% 55%) 18%, var(--surface-container-low, #f7f3f6)); color: var(--on-surface, #1d1b1e); font-size: 0.9rem; font-weight: 700; }
  .friend-icon img { width: 100%; height: 100%; object-fit: contain; }
  .friend-card__body { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; }
  .friend-card__top { display: flex; align-items: center; gap: 0.4rem; min-width: 0; }
  .friend-card__title { font-size: 0.86rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .friend-pin { flex: none; border-radius: 999px; background: var(--warning-soft, #fff3d6); color: var(--warning, #7a4d00); padding: 0.05rem 0.35rem; font-size: 0.62rem; }
  .friend-card__desc { color: var(--on-surface-variant, #5d5b5e); font-size: 0.75rem; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .friend-card__url { color: var(--on-surface-variant, #5d5b5e); font-size: 0.65rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; opacity: 0.8; }
  .friend-card--simple { min-height: 3.5rem; align-items: center; padding: 0.55rem 0.65rem; }
  .friend-card--simple .friend-icon { width: 2rem; height: 2rem; font-size: 0.8rem; }
  .friend-card--simple .friend-card__title { font-size: 0.82rem; }
  .friend-empty { padding: 3rem 1rem; text-align: center; color: var(--on-surface-variant, #5d5b5e); border: 1px dashed var(--outline-variant, rgba(0, 0, 0, 0.12)); border-radius: 0.9rem; font-size: 0.8rem; }
  .friend-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
  @media (max-width: 860px) {
    .friend-layout { grid-template-columns: 1fr; }
    .friend-tree { position: static; max-height: none; flex-direction: row; flex-wrap: wrap; gap: 0.25rem; }
    .friend-tree__head, .friend-tree__filter { flex: 1 0 100%; }
    .friend-cat { padding-left: 0; flex: 1 1 auto; }
    .friend-cat__select-inner { flex: none; }
    .friend-cat__select { flex: none; }
    .friend-cat__count { margin-left: 0.25rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .friend-card { transition: none; }
  }

  .friend-menu { position: fixed; z-index: 90; display: flex; flex-direction: column; min-width: 12rem; padding: 0.25rem; border: 1px solid var(--outline-variant, rgba(0, 0, 0, 0.12)); border-radius: 0.7rem; background: var(--surface-container-high, #fff); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18); }
  .friend-menu button { display: flex; align-items: center; gap: 0.45rem; text-align: left; border: 0; background: transparent; padding: 0.5rem 0.7rem; border-radius: 0.45rem; font: inherit; font-size: 0.78rem; color: var(--on-surface, #1d1b1e); cursor: pointer; }
  .friend-menu button:hover, .friend-menu button:focus-visible { background: var(--surface-container, #f1edf0); outline: none; }
  .friend-menu__icon { width: 1rem; flex: none; text-align: center; opacity: 0.65; font-size: 0.82rem; }
  .friend-qr { width: min(100%, 18rem); max-height: 90dvh; overflow: auto; border-radius: 1rem; background: var(--surface, #fff); color: var(--on-surface, #1d1b1e); box-shadow: 0 24px 64px rgba(0, 0, 0, 0.3); padding: 1rem; }
  .friend-qr__image { display: block; width: 100%; height: auto; border-radius: 0.75rem; background: #fff; }
  .friend-qr__url { margin: 0.6rem 0 0; color: var(--on-surface-variant, #5d5b5e); font-size: 0.68rem; line-height: 1.4; text-align: center; word-break: break-all; }
  .friend-icon-field { display: flex; align-items: center; gap: 0.4rem; }
  .friend-icon-preview { display: grid; place-items: center; width: 2.25rem; height: 2.25rem; flex: none; overflow: hidden; border: 1px solid var(--outline-variant, rgba(0, 0, 0, 0.12)); border-radius: 0.45rem; background: var(--surface-container-low, #f7f3f6); color: var(--on-surface, #1d1b1e); font-size: 0.8rem; font-weight: 700; }
  .friend-icon-preview img { width: 100%; height: 100%; object-fit: contain; }
  .friend-icon-field input { flex: 1; min-width: 0; }
  .friend-icon-fetch { flex: none; border: 1px solid var(--outline-variant, rgba(0, 0, 0, 0.12)); border-radius: 0.55rem; background: var(--surface-container-low, #f7f3f6); color: var(--on-surface-variant, #5d5b5e); padding: 0.45rem 0.55rem; font: inherit; font-size: 0.7rem; cursor: pointer; }
  .friend-icon-fetch:hover:not(:disabled) { background: var(--surface-container, #f1edf0); color: var(--on-surface, #1d1b1e); }
  .friend-icon-fetch:disabled { opacity: 0.5; cursor: default; }
  .friend-backdrop { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 1rem; background: rgba(0, 0, 0, 0.42); }
  .friend-dialog { width: min(100%, 32rem); max-height: 90dvh; overflow: auto; border-radius: 1rem; background: var(--surface, #fff); color: var(--on-surface, #1d1b1e); box-shadow: 0 24px 64px rgba(0, 0, 0, 0.3); padding: 1rem 1.1rem 1.1rem; }
  .friend-dialog__head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .friend-dialog h2 { margin: 0; font-size: 1.05rem; }
  .friend-dialog__close { width: 2rem; height: 2rem; border: 0; border-radius: 999px; background: transparent; color: var(--on-surface-variant, #5d5b5e); cursor: pointer; font-size: 1.25rem; line-height: 1; }
  .friend-dialog__close:hover { background: var(--surface-container, #f1edf0); }
  .friend-dialog__hint { margin: 0.4rem 0 0.8rem; color: var(--on-surface-variant, #5d5b5e); font-size: 0.75rem; line-height: 1.5; }
  .friend-form { display: flex; flex-direction: column; gap: 0.35rem; }
  .friend-form label { margin-top: 0.35rem; font-size: 0.72rem; color: var(--on-surface-variant, #5d5b5e); }
  .friend-form input, .friend-form textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--outline-variant, rgba(0, 0, 0, 0.12)); border-radius: 0.55rem; background: var(--surface-container-low, #f7f3f6); color: var(--on-surface, #1d1b1e); padding: 0.5rem 0.6rem; font: inherit; font-size: 0.8rem; }
  .friend-form input:focus-visible, .friend-form textarea:focus-visible { outline: 2px solid var(--primary, #8a3a3a); outline-offset: 1px; }
  .friend-honeypot { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
  .friend-dialog__actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.9rem; }
  .friend-cancel, .friend-submit { border: 0; border-radius: 999px; padding: 0.45rem 0.9rem; font: inherit; font-size: 0.78rem; cursor: pointer; }
  .friend-cancel { background: transparent; color: var(--on-surface-variant, #5d5b5e); }
  .friend-cancel:hover { background: var(--surface-container, #f1edf0); }
  .friend-submit { background: var(--primary, #8a3a3a); color: var(--on-primary, #fff); }
  .friend-submit:disabled { opacity: 0.55; cursor: default; }
  .friend-dialog__error { margin: 0.5rem 0 0; color: var(--danger, #b3261e); font-size: 0.75rem; }
  .friend-dialog__success { margin: 1rem 0; color: var(--success, #2e6b30); font-size: 0.85rem; }
</style>


