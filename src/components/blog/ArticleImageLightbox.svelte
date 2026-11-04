<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import PhotoLightbox from './PhotoLightbox.svelte'
  import { blogLocale } from '../../i18n'

  interface Props {
    locale?: ReturnType<typeof blogLocale>
  }

  interface LightboxPhoto {
    src: string
    alt: string
    caption?: string
  }

  let { locale = blogLocale('en') }: Props = $props()
  let photos = $state<LightboxPhoto[]>([])
  let index = $state<number | null>(null)

  // A plain article keeps its server-rendered still: the reading runtime (and its own lightbox) is
   // only loaded when a block needs it, so <img> clicks would otherwise do nothing. This tiny island
  // reuses that lightbox for the still, and stays out of the way when the runtime replaces the body.
  const bound = new WeakSet<HTMLImageElement>()

  function collect(): HTMLImageElement[] {
    return [...document.querySelectorAll<HTMLImageElement>('[data-blog-snapshot] img')]
      .filter((image) => image.src)
  }

  function bind(): void {
    for (const image of collect()) {
      if (bound.has(image)) continue
      bound.add(image)
      image.addEventListener('click', onClick)
      image.style.cursor = 'zoom-in'
    }
  }

  function onClick(event: Event): void {
    const image = event.currentTarget as HTMLImageElement
    if (!image.src) return
    const all = collect()
    const at = all.indexOf(image)
    if (at < 0) return
    event.preventDefault()
    photos = all.map((item, position) => ({
      src: item.src,
      alt: item.alt || `Image ${position + 1}`,
    }))
    index = at
  }

  let observer: MutationObserver | null = null

  onMount(() => {
    bind()
    observer = new MutationObserver(() => bind())
    const host = document.querySelector('[data-blog-reading-host]') ?? document.body
    observer.observe(host, { childList: true, subtree: true })
  })

  onDestroy(() => {
    observer?.disconnect()
    for (const image of collect()) image.removeEventListener('click', onClick)
  })
</script>

{#if index !== null && photos.length > 0}
  <PhotoLightbox {photos} index={Math.min(index, photos.length - 1)} {locale} onclose={() => (index = null)} />
{/if}
