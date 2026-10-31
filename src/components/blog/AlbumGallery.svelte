<script lang="ts">
  import { t, type BlogLocale } from '../../i18n'
  import PhotoLightbox from './PhotoLightbox.svelte'
  type LightboxPhoto = { src: string; alt: string; caption?: string }

  export interface AlbumPhotoView {
    id: string
    src: string
    alt: string
    caption?: string
  }

  let { photos, layout = 'grid', columns = 3, locale }: {
    photos: AlbumPhotoView[]
    layout?: string
    columns?: number
    locale: BlogLocale
  } = $props()

  const count = $derived(Math.min(4, Math.max(2, Math.round(columns) || 3)))
  const masonry = $derived(layout === 'masonry')
  let lightboxIndex = $state<number | null>(null)
  const lightboxPhotos = $derived<LightboxPhoto[]>(photos.map((photo) => ({ src: photo.src, alt: photo.alt, caption: photo.caption })))
</script>

{#if photos.length === 0}
  <div class="album-gallery-empty">{t(locale, 'collections.empty')}</div>
{:else}
  <div
    class="album-gallery"
    class:album-gallery--masonry={masonry}
    style={`--album-columns:${count}`}
    aria-label={t(locale, 'common.photos')}
  >
    {#each photos as photo, index (photo.id)}
      <button type="button" class="album-photo" aria-label={`${t(locale, 'friends.open')}: ${photo.alt}`} onclick={() => (lightboxIndex = index)}>
        <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" />
        {#if photo.caption}<span class="album-photo__caption">{photo.caption}</span>{/if}
      </button>
    {/each}
  </div>
{/if}

{#if lightboxIndex !== null}
  <PhotoLightbox photos={lightboxPhotos} index={lightboxIndex} {locale} onclose={() => (lightboxIndex = null)} />
{/if}

<style>
  .album-gallery { display: grid; grid-template-columns: repeat(var(--album-columns, 3), minmax(0, 1fr)); gap: 0.55rem; align-items: start; }
  .album-gallery--masonry { display: block; column-count: var(--album-columns, 3); column-gap: 0.55rem; }
  .album-photo { position: relative; display: block; width: 100%; margin: 0 0 0.55rem; padding: 0; overflow: hidden; border: 1px solid var(--outline-variant, rgba(0, 0, 0, 0.12)); border-radius: 0.75rem; background: var(--surface-container-low, #f7f3f6); cursor: zoom-in; break-inside: avoid; }
  .album-photo img { display: block; width: 100%; height: auto; transition: transform 0.2s ease; }
  .album-gallery:not(.album-gallery--masonry) .album-photo img { aspect-ratio: 4 / 3; object-fit: cover; }
  .album-photo:hover img { transform: scale(1.015); }
  .album-photo:focus-visible { outline: 2px solid var(--primary, #8a3a3a); outline-offset: 2px; }
  .album-photo__caption { position: absolute; inset: auto 0 0; padding: 0.35rem 0.45rem; background: linear-gradient(transparent, rgba(0, 0, 0, 0.65)); color: #fff; font-size: 0.68rem; }
  .album-gallery-empty { padding: 2.5rem 1rem; text-align: center; color: var(--on-surface-variant, #5d5b5e); border: 1px dashed var(--outline-variant, rgba(0, 0, 0, 0.12)); border-radius: 0.9rem; font-size: 0.8rem; }
  @media (max-width: 640px) {
    .album-gallery { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .album-gallery--masonry { column-count: 2; }
  }
</style>
