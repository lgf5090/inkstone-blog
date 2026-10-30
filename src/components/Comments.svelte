<script lang="ts">
  import type { BlogCommentsResponse, PublicBlogComment } from '../lib/blog-types'

  interface Props {
    slug: string
    enabled: boolean
    discussion: BlogCommentsResponse['discussion']
    initial: PublicBlogComment[]
  }

  let { slug, enabled, discussion, initial }: Props = $props()

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
      return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
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
        body: JSON.stringify({
          authorName,
          email,
          content,
          parentId,
          website,
        }),
      })
      const payload = await response.json().catch(() => null) as
        | { status?: string; error?: { message?: string } }
        | null
      if (!response.ok) throw new Error(payload?.error?.message || 'The comment could not be posted.')
      content = ''
      cancelReply()
      if (payload?.status === 'pending') {
        notice = 'Your comment is waiting for moderation.'
      } else {
        await reload()
        notice = 'Your comment is published.'
      }
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause)
    } finally {
      submitting = false
    }
  }
</script>

<section class="mt-14 border-t border-white/10 pt-8" aria-labelledby="comments-heading" data-blog-comments>
  <h2 id="comments-heading" class="text-lg font-semibold text-white">
    Comments <span class="text-slate-500">({flat.length})</span>
  </h2>

  {#if flat.length === 0}
    <p class="mt-3 text-sm text-slate-500">No comments yet.</p>
  {:else}
    <ol class="mt-5 space-y-5">
      {#each flat as entry (entry.node.id)}
        <li style={`margin-left: ${Math.min(entry.depth, 3) * 18}px`}>
          <article class="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div class="flex flex-wrap items-baseline justify-between gap-2 text-xs text-slate-500">
              <span class="font-medium text-slate-200">
                {#if entry.node.authorUrl}
                  <a href={entry.node.authorUrl} target="_blank" rel="noopener noreferrer nofollow" class="hover:text-sky-300">{entry.node.authorName}</a>
                {:else}
                  {entry.node.authorName}
                {/if}
              </span>
              <time datetime={new Date(entry.node.createdAt).toISOString()}>{formatDate(entry.node.createdAt)}</time>
            </div>
            <p class="mt-2 text-sm leading-relaxed whitespace-pre-wrap break-words text-slate-300">{entry.node.content}</p>
            {#if enabled && discussion.allowReplies}
              <button
                type="button"
                class="mt-2 text-xs text-slate-500 hover:text-sky-300"
                onclick={() => startReply(entry.node)}
              >
                Reply
              </button>
            {/if}
          </article>
        </li>
      {/each}
    </ol>
  {/if}

  {#if enabled}
    <form class="mt-8 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5" onsubmit={submit}>
      <h3 class="text-sm font-semibold text-white">Leave a comment</h3>
      {#if replyToName}
        <p class="text-xs text-sky-300">
          Replying to {replyToName}.
          <button type="button" class="ml-1 underline underline-offset-2" onclick={cancelReply}>Cancel</button>
        </p>
      {/if}
      <div class="hidden" aria-hidden="true">
        <label for="comment-website">Website</label>
        <input id="comment-website" bind:value={website} tabindex="-1" autocomplete="off" />
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label for="comment-name" class="mb-1 block text-xs text-slate-400">Name</label>
          <input
            id="comment-name"
            bind:value={authorName}
            required={discussion.requireNameEmail}
            maxlength="80"
            autocomplete="name"
            class="w-full rounded-lg border border-white/10 bg-[#0b0f17] px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
          />
        </div>
        <div>
          <label for="comment-email" class="mb-1 block text-xs text-slate-400">Email</label>
          <input
            id="comment-email"
            type="email"
            bind:value={email}
            required={discussion.requireNameEmail}
            maxlength="254"
            autocomplete="email"
            class="w-full rounded-lg border border-white/10 bg-[#0b0f17] px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
          />
          <p class="mt-1 text-[11px] text-slate-600">Not published. Used only to verify the comment.</p>
        </div>
      </div>
      <div>
        <label for="comment-content" class="mb-1 block text-xs text-slate-400">Comment</label>
        <textarea
          id="comment-content"
          bind:this={textarea}
          bind:value={content}
          required
          maxlength={discussion.maxLength}
          rows="4"
          class="w-full resize-y rounded-lg border border-white/10 bg-[#0b0f17] px-3 py-2 text-sm leading-relaxed text-slate-100 outline-none focus:border-sky-400"
          aria-describedby={error ? 'comment-error' : undefined}
        ></textarea>
      </div>
      {#if error}<p id="comment-error" role="alert" class="text-xs text-red-300">{error}</p>{/if}
      {#if notice}<p role="status" class="text-xs text-emerald-300">{notice}</p>{/if}
      <button
        type="submit"
        disabled={submitting}
        class="rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-50"
      >
        {submitting ? 'Posting…' : 'Post comment'}
      </button>
      {#if discussion.requireApproval}
        <p class="text-[11px] text-slate-600">Comments are moderated before they appear.</p>
      {/if}
    </form>
  {:else}
    <p class="mt-4 text-sm text-slate-500">Comments are closed on this post.</p>
  {/if}
</section>
