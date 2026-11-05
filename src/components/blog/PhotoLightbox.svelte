<script lang="ts">
  import { onMount, tick } from 'svelte'
  import { t, type BlogLocale } from '../../i18n'

  type LightboxPhoto = { src: string; alt: string; caption?: string }

  let { photos, index = 0, locale, onclose }: {
    photos: LightboxPhoto[]
    index?: number
    locale: BlogLocale
    onclose: () => void
  } = $props()

  // svelte-ignore state_referenced_locally
  let current = $state(Math.min(Math.max(index, 0), Math.max(photos.length - 1, 0)))
  let dialog = $state<HTMLDivElement | null>(null)
  let closeButton = $state<HTMLButtonElement | null>(null)

  const photo = $derived(photos[current] ?? photos[0])

  function go(delta: number): void {
    const next = current + delta
    if (next >= 0 && next < photos.length) current = next
  }

  function onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault()
      onclose()
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      go(-1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      go(1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      current = 0
    } else if (event.key === 'End') {
      event.preventDefault()
      current = photos.length - 1
    }
  }

  onMount(() => {
    void tick().then(() => closeButton?.focus())
  })
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="lightbox" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) onclose() }}>
  <div class="lightbox__dialog" role="dialog" aria-modal="true" aria-label={t(locale, 'common.photos')} tabindex="-1" bind:this={dialog} onkeydown={onKey}>
    <div class="lightbox__bar">
      <span class="lightbox__count" aria-live="polite">{current + 1} / {photos.length}</span>
      <button bind:this={closeButton} type="button" class="lightbox__close" aria-label={t(locale, 'friends.close')} onclick={onclose}>×</button>
    </div>
    <div class="lightbox__stage">
      <button type="button" class="lightbox__nav" aria-label={t(locale, 'common.previous')} disabled={current === 0} onclick={() => go(-1)}>‹</button>
      {#if photo}
        <img src={photo.src} alt={photo.alt} />
      {/if}
      <button type="button" class="lightbox__nav" aria-label={t(locale, 'common.next')} disabled={current === photos.length - 1} onclick={() => go(1)}>›</button>
    </div>
    {#if photo?.caption}<p class="lightbox__caption">{photo.caption}</p>{/if}
  </div>
</div>

<style>
  .lightbox {
    position: fixed;
    inset: 0;
    z-index: var(--z-pop);
    display: grid;
    place-items: center;
    padding: var(--sp-4);
    background: var(--scrim);
    backdrop-filter: blur(var(--memo-blur));
  }
  .lightbox__dialog {
    width: min(94vw, 68rem);
    max-height: 92dvh;
    display: flex;
    flex-direction: column;
    gap: var(--sp-2-5);
    color: var(--media-text-strong);
    outline: none;
  }
  .lightbox__bar { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-4); }
  .lightbox__count { font-size: var(--text-12); color: var(--media-text); font-variant-numeric: tabular-nums; }
  .lightbox__close,
  .lightbox__nav {
    display: inline-grid;
    place-items: center;
    border: 1px solid var(--overlay-surface);
    border-radius: var(--r-full);
    background: var(--media-control);
    color: var(--media-text-strong);
    cursor: pointer;
    transition: background-color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
  }
  .lightbox__close { width: var(--sp-8); height: var(--sp-8); font-size: var(--text-20); line-height: 1; }
  .lightbox__nav { flex: none; width: var(--sp-9); height: var(--sp-9); font-size: var(--text-22); line-height: 1; }
  .lightbox__close:hover,
  .lightbox__nav:hover:not(:disabled) { background: var(--media-control-hover); }
  .lightbox__close:active,
  .lightbox__nav:active:not(:disabled) { transform: scale(0.94); }
  .lightbox__nav:disabled { opacity: 0.25; cursor: default; }
  .lightbox__stage { display: flex; align-items: center; justify-content: center; gap: var(--sp-2-5); min-height: 0; }
  .lightbox__stage img {
    max-width: 100%;
    max-height: 78dvh;
    object-fit: contain;
    border-radius: var(--r-lg);
    background: var(--media-scrim);
  }
  .lightbox__caption { margin: 0; text-align: center; color: var(--media-text); font-size: var(--text-12); }
</style>
