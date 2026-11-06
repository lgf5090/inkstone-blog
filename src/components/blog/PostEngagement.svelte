<script lang="ts">
  import { t, type BlogLocale } from '../../i18n'
  import type { BlogEngagementState } from '../../lib/blog-types'

  interface Props {
    slug: string
    locale: BlogLocale
    initial: BlogEngagementState
  }

  let { slug, locale, initial }: Props = $props()
  // svelte-ignore state_referenced_locally
  let engagement = $state<BlogEngagementState>(initial)
  let pending = $state<'like' | 'favorite' | ''>('')
  let error = $state('')
  const VISITOR_COOKIE = 'inkstone_blog_visitor'
  const VISITOR_PATTERN = /^[A-Za-z0-9_-]{16,80}$/

  function readVisitor(): string | null {
    const match = new RegExp(`(?:^|; )${VISITOR_COOKIE}=([^;]+)`).exec(document.cookie)
    const value = match?.[1] ?? ''
    return VISITOR_PATTERN.test(value) ? value : null
  }

  function ensureVisitor(): string {
    const existing = readVisitor()
    if (existing) return existing
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    let id = ''
    for (const byte of bytes) id += byte.toString(16).padStart(2, '0')
    const secure = window.location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `${VISITOR_COOKIE}=${id}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`
    return id
  }

  async function update(patch: { like?: boolean; favorite?: boolean }, kind: 'like' | 'favorite'): Promise<void> {
    if (pending) return
    error = ''
    pending = kind
    try {
      const visitor = ensureVisitor()
      const response = await fetch(`/api/blog/engagement/posts/${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          'x-blog-visitor': visitor,
        },
        body: JSON.stringify(patch),
      })
      if (!response.ok) throw new Error(String(response.status))
      engagement = await response.json() as BlogEngagementState
    } catch {
      error = t(locale, 'engagement.error')
    } finally {
      pending = ''
    }
  }

  const likeLabel = $derived(engagement.liked ? t(locale, 'engagement.liked') : t(locale, 'engagement.like'))
  const favoriteLabel = $derived(engagement.favorited ? t(locale, 'engagement.favorited') : t(locale, 'engagement.favorite'))
  const countLabel = $derived(t(locale, 'engagement.likeCount').replace('{count}', String(engagement.likeCount)))
</script>

<div class="engagement-bar">
  <div class="engagement-actions">
    <button
      type="button"
      class="engagement-button"
      class:is-active={engagement.liked}
      aria-pressed={engagement.liked}
      aria-label={`${likeLabel}, ${countLabel}`}
      disabled={pending === 'like'}
      onclick={() => void update({ like: !engagement.liked }, 'like')}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path d="M12 20.2c-.4 0-.8-.1-1.1-.4C6.5 16.3 3 13.2 3 9.6 3 6.9 5.1 5 7.6 5c1.5 0 2.8.7 3.7 1.9l.7.9.7-.9C13.6 5.7 14.9 5 16.4 5 18.9 5 21 6.9 21 9.6c0 3.6-3.5 6.7-7.9 10.2-.3.3-.7.4-1.1.4Z" fill="currentColor" />
      </svg>
      <span>{likeLabel}</span>
      <span class="engagement-count">{engagement.likeCount}</span>
    </button>
    <button
      type="button"
      class="engagement-button"
      class:is-active={engagement.favorited}
      aria-pressed={engagement.favorited}
      aria-label={favoriteLabel}
      disabled={pending === 'favorite'}
      onclick={() => void update({ favorite: !engagement.favorited }, 'favorite')}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path d="M6 3.8h12c.6 0 1 .4 1 1v16.1c0 .4-.4.7-.8.5l-6.2-3.7-6.2 3.7c-.4.2-.8-.1-.8-.5V4.8c0-.6.4-1 1-1Z" fill="currentColor" />
      </svg>
      <span>{favoriteLabel}</span>
    </button>
    <a class="engagement-saved-link" href="/reading">{t(locale, 'engagement.savedLink')}</a>
  </div>
  <p class="engagement-hint">{t(locale, 'engagement.visitorStored')}</p>
  {#if error}<p class="engagement-error" role="alert">{error}</p>{/if}
</div>
