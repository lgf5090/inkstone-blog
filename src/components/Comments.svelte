<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import type { BlogCommentsResponse, BlogSitePublic, PublicBlogComment } from '../lib/blog-types'
  import { t, type BlogLocale } from '../i18n'
  import { safeUrl } from '../lib/format'

  interface Props {
    slug: string
    enabled: boolean
    discussion: BlogCommentsResponse['discussion']
    initial: PublicBlogComment[]
    locale: BlogLocale
    provider?: BlogSitePublic['comment']['provider']
    providerConfig?: BlogSitePublic['comment']
  }

  let { slug, enabled, discussion, initial, locale, provider = 'none', providerConfig }: Props = $props()
  const external = $derived(provider === 'twikoo' || provider === 'giscus' || provider === 'waline')
  let externalHost: HTMLDivElement | undefined = $state()
  let externalError = $state('')
  const addedScripts: HTMLScriptElement[] = []

  function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = src
      script.async = true
      script.dataset.commentProvider = provider
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
        await loadScript('https://cdn.jsdelivr.net/npm/twikoo@1.7.20/dist/twikoo.min.js')
        const twikoo = (window as unknown as { twikoo?: { init: (options: Record<string, unknown>) => void } }).twikoo
        if (!twikoo?.init) throw new Error('twikoo unavailable')
        twikoo.init({ envId: providerConfig.twikoo.envId, el: externalHost, path: `/posts/${slug}` })
        return
      }
      if (!providerConfig.waline.serverURL) throw new Error('missing waline config')
      await loadScript('https://unpkg.com/@waline/client@3/dist/waline.js')
      const Waline = (window as unknown as { Waline?: { init: (options: Record<string, unknown>) => void } }).Waline
      if (!Waline?.init) throw new Error('waline unavailable')
      Waline.init({ el: externalHost, serverURL: providerConfig.waline.serverURL, path: `/posts/${slug}`, dark: 'html.dark' })
    } catch (cause) {
      console.warn('[blog] external comment provider failed', cause)
      externalError = t(locale, 'comments.externalMissing')
    }
  }

  onMount(() => {
    void mountExternal()
  })

  onDestroy(() => {
    for (const script of addedScripts) script.remove()
    addedScripts.length = 0
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
      if (!response.ok) throw new Error(payload?.error?.message || t(locale, 'comments.loadFailed'))
      content = ''
      cancelReply()
      if (payload?.status === 'pending') {
        notice = t(locale, 'comments.pending')
      } else {
        await reload()
        notice = t(locale, 'comments.published')
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
    {t(locale, 'comments.title')}{#if !external} <span class="muted">({flat.length})</span>{/if}
  </h2>

  {#if external}
    <div class="comment-provider" bind:this={externalHost}></div>
    {#if externalError}<p class="comment-error" role="alert">{externalError}</p>{/if}
  {:else}
  {#if flat.length === 0}
    <p class="comments-empty">{t(locale, 'comments.empty')}</p>
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
                {t(locale, 'comments.reply')}
              </button>
            {/if}
          </article>
        </li>
      {/each}
    </ol>
  {/if}

  {#if enabled}
    <form class="comment-form" onsubmit={submit}>
      <h3>{t(locale, 'comments.leave')}</h3>
      {#if replyToName}
        <p class="comment-notice">
          {t(locale, 'comments.replyingTo')} {replyToName}.
          <button type="button" class="comment-action" onclick={cancelReply}>{t(locale, 'comments.cancel')}</button>
        </p>
      {/if}
      <div class="hidden" aria-hidden="true">
        <label for="comment-website">Website</label>
        <input id="comment-website" bind:value={website} tabindex="-1" autocomplete="off" />
      </div>
      <div class="comment-fields">
        <div>
          <label for="comment-name" class="comment-label">{t(locale, 'comments.name')}</label>
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
          <label for="comment-email" class="comment-label">{t(locale, 'comments.email')}</label>
          <input
            id="comment-email"
            type="email"
            bind:value={email}
            required={discussion.requireNameEmail}
            maxlength="254"
            autocomplete="email"
            class="comment-input"
          />
          <p class="comment-hint">{t(locale, 'comments.emailHint')}</p>
        </div>
      </div>
      <div>
        <label for="comment-content" class="comment-label">{t(locale, 'comments.content')}</label>
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
        {submitting ? t(locale, 'comments.posting') : t(locale, 'comments.submit')}
      </button>
      {#if discussion.requireApproval}
        <p class="comment-hint">{t(locale, 'comments.moderated')}</p>
      {/if}
    </form>
  {:else}
    <p class="comments-empty">{t(locale, 'comments.closed')}</p>
  {/if}
  {/if}
</section>
