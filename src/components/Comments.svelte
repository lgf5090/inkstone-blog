<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import type { BlogCommentsResponse, BlogSitePublic, PublicBlogComment } from '../lib/blog-types'
  import type { BlogLocale } from '../i18n'
  import { translator, type ClientMessages } from '../i18n/client'
  import { safeUrl } from '../lib/format'

  interface Props {
    slug: string
    enabled: boolean
    discussion: BlogCommentsResponse['discussion']
    initial: PublicBlogComment[]
    locale: BlogLocale
    messages: ClientMessages
    provider?: BlogSitePublic['comment']['provider']
    providerConfig?: BlogSitePublic['comment']
  }

  let { slug, enabled, discussion, initial, locale, messages, provider = 'none', providerConfig }: Props = $props()
  const tr = $derived(translator(messages))
  const external = $derived(provider === 'twikoo' || provider === 'giscus' || provider === 'waline')
  let externalHost: HTMLDivElement | undefined = $state()
  let externalError = $state('')
  const addedScripts: HTMLScriptElement[] = []
  const addedStyles: HTMLLinkElement[] = []
  const TWIKOO_SCRIPT = 'https://cdn.jsdelivr.net/npm/twikoo@1.7.20/dist/twikoo.min.js'
  const TWIKOO_INTEGRITY = 'sha384-yoiW6B9POkG8YiZgmBFK1Q3jJhKNqcdMOJGKRUDAno6UZBq8XHCDyx10i1INEjbz'
  const WALINE_SCRIPT = 'https://unpkg.com/@waline/client@3.16.1/dist/waline.umd.js'
  const WALINE_INTEGRITY = 'sha384-Db96/JOSAyLRgkP/3u25qrE0vadi19jxrpdGiz4Kolu+w4sI5x2K3trlUB69n5D5'
  const WALINE_CSS = 'https://unpkg.com/@waline/client@3.16.1/dist/waline.css'
  const WALINE_CSS_INTEGRITY = 'sha384-JQsDJd0Q+SCQkICQDOYZZVYNV6zUSpp3ivfffGZJBKPjMqWrhG6uIjqEZjQjH3dx'

  function loadStylesheet(href: string, integrity: string): void {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.integrity = integrity
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
    addedStyles.push(link)
  }

  function loadScript(src: string, integrity?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = src
      script.async = true
      script.dataset.commentProvider = provider
      if (integrity) {
        script.integrity = integrity
        script.crossOrigin = 'anonymous'
      }
      script.onload = () => resolve()
      script.onerror = () => reject(new Error(`Could not load ${src}`))
      document.head.appendChild(script)
      addedScripts.push(script)
    })
  }

  async function mountExternal(): Promise<void> {
    if (!external || !enabled || !externalHost || !providerConfig) return
    externalHost.replaceChildren()
    externalError = ''
    try {
      if (provider === 'giscus') {
        const giscus = providerConfig.giscus
        if (!giscus.repo || !giscus.repoId) throw new Error('missing giscus config')
        // giscus ships one unversioned client that derives its widget origin from this script's URL:
        // a self-hosted copy would point the iframe at this site, and there is no stable bytes-to-hash
        // URL to pin. It therefore stays on the official origin under the CSP allowlist.
        const script = document.createElement('script')
        script.src = 'https://giscus.app/client.js'
        script.async = true
        script.dataset.commentProvider = provider
        script.setAttribute('data-repo', giscus.repo)
        script.setAttribute('data-repo-id', giscus.repoId)
        script.setAttribute('data-category', giscus.category)
        script.setAttribute('data-category-id', giscus.categoryId)
        script.setAttribute('data-mapping', 'pathname')
        script.setAttribute('data-strict', '0')
        script.setAttribute('data-reactions-enabled', '1')
        script.setAttribute('data-emit-metadata', '0')
        script.setAttribute('data-input-position', 'bottom')
        script.setAttribute('data-theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light')
        script.setAttribute('data-lang', locale)
        script.setAttribute('crossorigin', 'anonymous')
        externalHost.appendChild(script)
        addedScripts.push(script)
        return
      }
      if (provider === 'twikoo') {
        if (!providerConfig.twikoo.envId) throw new Error('missing twikoo config')
        await loadScript(TWIKOO_SCRIPT, TWIKOO_INTEGRITY)
        const twikoo = (window as unknown as { twikoo?: { init: (options: Record<string, unknown>) => void } }).twikoo
        if (!twikoo?.init) throw new Error('twikoo unavailable')
        twikoo.init({ envId: providerConfig.twikoo.envId, el: externalHost, path: `/posts/${slug}` })
        return
      }
      if (!providerConfig.waline.serverURL) throw new Error('missing waline config')
      loadStylesheet(WALINE_CSS, WALINE_CSS_INTEGRITY)
      await loadScript(WALINE_SCRIPT, WALINE_INTEGRITY)
      const Waline = (window as unknown as { Waline?: { init: (options: Record<string, unknown>) => void } }).Waline
      if (!Waline?.init) throw new Error('waline unavailable')
      Waline.init({ el: externalHost, serverURL: providerConfig.waline.serverURL, path: `/posts/${slug}`, dark: 'html.dark' })
    } catch (cause) {
      console.warn('[blog] external comment provider failed', cause)
      externalError = tr('comments.externalMissing')
    }
  }

  onMount(() => {
    void mountExternal()
  })

  onDestroy(() => {
    for (const script of addedScripts) script.remove()
    for (const link of addedStyles) link.remove()
    addedScripts.length = 0
    addedStyles.length = 0
  })

  // svelte-ignore state_referenced_locally
  let items = $state<PublicBlogComment[]>(initial)
  let authorName = $state('')
  let email = $state('')
  let content = $state('')
  let website = $state('')
  let parentId = $state<string | null>(null)
  let replyToName = $state('')
  let error = $state('')
  let notice = $state('')
  let submitting = $state(false)
  let textarea: HTMLTextAreaElement | undefined = $state()

  interface FlatComment {
    node: PublicBlogComment
    depth: number
  }

  function flatten(nodes: PublicBlogComment[], depth = 0, into: FlatComment[] = []): FlatComment[] {
    for (const node of nodes) {
      into.push({ node, depth })
      if (node.replies.length) flatten(node.replies, depth + 1, into)
    }
    return into
  }

  const flat = $derived(flatten(items))

  function formatDate(value: number): string {
    try {
      return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    } catch {
      return new Date(value).toISOString().slice(0, 10)
    }
  }

  async function reload(): Promise<void> {
    const response = await fetch(`/api/blog/posts/${encodeURIComponent(slug)}/comments`, {
      headers: { accept: 'application/json' },
    })
    if (!response.ok) return
    const payload = (await response.json()) as BlogCommentsResponse
    items = payload.items
  }

  function startReply(node: PublicBlogComment): void {
    parentId = node.id
    replyToName = node.authorName
    textarea?.focus()
  }

  function cancelReply(): void {
    parentId = null
    replyToName = ''
  }

  async function submit(event: SubmitEvent): Promise<void> {
    event.preventDefault()
    if (submitting || !enabled) return
    error = ''
    notice = ''
    submitting = true
    try {
      const response = await fetch(`/api/blog/posts/${encodeURIComponent(slug)}/comments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ authorName, email, content, parentId, website }),
      })
      const payload = await response.json().catch(() => null) as
        | { status?: string; error?: { message?: string } }
        | null
      if (!response.ok) throw new Error(payload?.error?.message || tr('comments.loadFailed'))
      content = ''
      cancelReply()
      if (payload?.status === 'pending') {
        notice = tr('comments.pending')
      } else {
        await reload()
        notice = tr('comments.published')
      }
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause)
    } finally {
      submitting = false
    }
  }
</script>

<section class="comments-section" aria-labelledby="comments-heading" data-blog-comments>
  <h2 id="comments-heading" class="comments-title">
    {tr('comments.title')}{#if !external} <span class="muted">({flat.length})</span>{/if}
  </h2>

  {#if external}
    <div class="comment-provider" bind:this={externalHost}></div>
    {#if externalError}<p class="comment-error" role="alert">{externalError}</p>{/if}
  {:else}
  {#if flat.length === 0}
    <p class="comments-empty">{tr('comments.empty')}</p>
  {:else}
    <ol class="comments-list">
      {#each flat as entry (entry.node.id)}
        {@const authorHref = safeUrl(entry.node.authorUrl)}
        <li style={`margin-left: ${Math.min(entry.depth, 3) * 18}px`}>
          <article class="comment-card">
            <div class="comment-meta">
              <span class="comment-author">
                {#if authorHref}
                  <a href={authorHref} target="_blank" rel="noopener noreferrer nofollow">{entry.node.authorName}</a>
                {:else}
                  {entry.node.authorName}
                {/if}
              </span>
              <time datetime={new Date(entry.node.createdAt).toISOString()}>{formatDate(entry.node.createdAt)}</time>
            </div>
            <p class="comment-body">{entry.node.content}</p>
            {#if enabled && discussion.allowReplies}
              <button type="button" class="comment-action" onclick={() => startReply(entry.node)}>
                {tr('comments.reply')}
              </button>
            {/if}
          </article>
        </li>
      {/each}
    </ol>
  {/if}

  {#if enabled}
    <form class="comment-form" onsubmit={submit}>
      <h3>{tr('comments.leave')}</h3>
      {#if replyToName}
        <p class="comment-notice">
          {tr('comments.replyingTo')} {replyToName}.
          <button type="button" class="comment-action" onclick={cancelReply}>{tr('comments.cancel')}</button>
        </p>
      {/if}
      <div class="hidden" aria-hidden="true">
        <label for="comment-website">Website</label>
        <input id="comment-website" bind:value={website} tabindex="-1" autocomplete="off" />
      </div>
      <div class="comment-fields">
        <div>
          <label for="comment-name" class="comment-label">{tr('comments.name')}</label>
          <input
            id="comment-name"
            bind:value={authorName}
            required={discussion.requireNameEmail}
            maxlength="80"
            autocomplete="name"
            class="comment-input"
          />
        </div>
        <div>
          <label for="comment-email" class="comment-label">{tr('comments.email')}</label>
          <input
            id="comment-email"
            type="email"
            bind:value={email}
            required={discussion.requireNameEmail}
            maxlength="254"
            autocomplete="email"
            class="comment-input"
          />
          <p class="comment-hint">{tr('comments.emailHint')}</p>
        </div>
      </div>
      <div>
        <label for="comment-content" class="comment-label">{tr('comments.content')}</label>
        <textarea
          id="comment-content"
          bind:this={textarea}
          bind:value={content}
          required
          maxlength={discussion.maxLength}
          rows="4"
          class="comment-input"
          aria-describedby={error ? 'comment-error' : undefined}
        ></textarea>
      </div>
      {#if error}<p id="comment-error" role="alert" class="comment-error">{error}</p>{/if}
      {#if notice}<p role="status" class="comment-notice">{notice}</p>{/if}
      <button type="submit" disabled={submitting} class="comment-submit">
        {submitting ? tr('comments.posting') : tr('comments.submit')}
      </button>
      {#if discussion.requireApproval}
        <p class="comment-hint">{tr('comments.moderated')}</p>
      {/if}
    </form>
  {:else}
    <p class="comments-empty">{tr('comments.closed')}</p>
  {/if}
  {/if}
</section>
