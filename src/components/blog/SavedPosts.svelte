<script lang="ts">
  import { t, type BlogLocale } from '../../i18n'
  import type { BlogSavedPost } from '../../lib/blog-types'
  import { formatDate, postUrl } from '../../lib/format'

  interface Props {
    items: BlogSavedPost[]
    locale: BlogLocale
    permalinkEnabled: boolean
    timeZone: string
  }

  let { items, locale, permalinkEnabled, timeZone }: Props = $props()
  // svelte-ignore state_referenced_locally
  let saved = $state<BlogSavedPost[]>(items)
  let removing = $state('')
  let error = $state('')
  const VISITOR_COOKIE = 'inkstone_blog_visitor'
  const VISITOR_PATTERN = /^[A-Za-z0-9_-]{16,80}$/

  function readVisitor(): string | null {
    const match = new RegExp(`(?:^|; )${VISITOR_COOKIE}=([^;]+)`).exec(document.cookie)
    const value = match?.[1] ?? ''
    return VISITOR_PATTERN.test(value) ? value : null
  }

  async function remove(item: BlogSavedPost): Promise<void> {
    if (removing) return
    const visitor = readVisitor()
    if (!visitor) {
      error = t(locale, 'engagement.error')
      return
    }
    error = ''
    removing = item.slug
    try {
      const response = await fetch(`/api/blog/engagement/posts/${encodeURIComponent(item.slug)}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          'x-blog-visitor': visitor,
        },
        body: JSON.stringify({ favorite: false }),
      })
      if (!response.ok) throw new Error(String(response.status))
      saved = saved.filter((entry) => entry.slug !== item.slug)
    } catch {
      error = t(locale, 'engagement.error')
    } finally {
      removing = ''
    }
  }
</script>

<section class="saved-list" aria-labelledby="saved-list-heading">
  <h2 id="saved-list-heading" class="saved-list-title">{t(locale, 'engagement.savedTitle')}</h2>
  <p class="saved-list-description">{t(locale, 'engagement.savedDescription')}</p>
  {#if saved.length === 0}
    <div class="saved-empty">
      <p>{t(locale, 'engagement.savedEmpty')}</p>
      <p class="muted">{t(locale, 'engagement.savedEmptyHint')}</p>
      <a class="chip" href="/">{t(locale, 'common.backHome')}</a>
    </div>
  {:else}
    <ul class="saved-items">
      {#each saved as item (item.slug)}
        <li class="saved-item">
          <div class="saved-item-main">
            <a class="saved-item-title" href={postUrl(item.slug, item.permalink, permalinkEnabled)}>{item.title || t(locale, 'common.untitled')}</a>
            <p class="saved-item-meta">
              {item.category || formatDate(item.publishedAt ?? item.updatedAt, locale, timeZone)}
              · {formatDate(item.savedAt, locale, timeZone)}
            </p>
          </div>
          <button
            type="button"
            class="saved-item-remove"
            disabled={removing === item.slug}
            aria-label={`${t(locale, 'engagement.savedRemove')}: ${item.title || t(locale, 'common.untitled')}`}
            onclick={() => void remove(item)}
          >
            {t(locale, 'engagement.savedRemove')}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
  {#if error}<p class="engagement-error" role="alert">{error}</p>{/if}
</section>
