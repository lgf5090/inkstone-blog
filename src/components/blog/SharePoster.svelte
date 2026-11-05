<script lang="ts">
  import { t, type BlogLocale } from '../../i18n'

  interface Props {
    title: string
    description: string
    author: string
    published: string
    siteTitle: string
    url: string
    coverUrl?: string | null
    locale: BlogLocale
  }
  let { title, description, author, published, siteTitle, url, coverUrl = null, locale }: Props = $props()

  let open = $state(false)
  let status = $state<'idle' | 'working' | 'ready' | 'error'>('idle')
  let imageUrl = $state('')
  let trigger: HTMLButtonElement | undefined = $state()
  let closeButton: HTMLButtonElement | undefined = $state()

  function wrap(context: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
    const lines: string[] = []
    let line = ''
    for (const char of text) {
      const next = line + char
      if (context.measureText(next).width > maxWidth && line) {
        lines.push(line)
        line = char
        if (lines.length === maxLines - 1) break
      } else {
        line = next
      }
    }
    if (line && lines.length < maxLines) lines.push(line)
    if (lines.length === maxLines && text.length > lines.join('').length) {
      lines[maxLines - 1] = lines[maxLines - 1]!.replace(/.{2}$/, '…')
    }
    return lines
  }

  async function generate(): Promise<void> {
    status = 'working'
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    imageUrl = ''
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 1080
      canvas.height = 1350
      const context = canvas.getContext('2d')
      if (!context) throw new Error('canvas unavailable')
      const styles = getComputedStyle(document.documentElement)
      const token = (name: string) => styles.getPropertyValue(name).trim()
      const backdrop = token('--bg-base')
      const ink = token('--text-primary')
      const inkSoft = token('--text-secondary')
      const inkFaint = token('--text-tertiary')
      context.fillStyle = backdrop
      context.fillRect(0, 0, canvas.width, canvas.height)
      if (coverUrl) {
        try {
          const image = new Image()
          image.crossOrigin = 'anonymous'
          image.src = coverUrl
          await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve()
            image.onerror = () => reject(new Error('cover failed'))
          })
          context.drawImage(image, 0, 0, canvas.width, 620)
          const fade = context.createLinearGradient(0, 380, 0, 700)
          fade.addColorStop(0, 'transparent')
          fade.addColorStop(1, backdrop)
          context.fillStyle = fade
          context.fillRect(0, 380, canvas.width, 340)
        } catch {
          // A cover is decorative; the poster still works without it.
        }
      }
      const startY = coverUrl ? 720 : 220
      context.fillStyle = ink
      context.font = `700 64px ${token('--font-ui')}`
      const titleLines = wrap(context, title, 900, 3)
      titleLines.forEach((line, index) => context.fillText(line, 90, startY + index * 80))
      context.fillStyle = inkSoft
      context.font = `400 30px ${token('--font-ui')}`
      const descriptionLines = wrap(context, description, 900, 3)
      descriptionLines.forEach((line, index) => context.fillText(line, 90, startY + titleLines.length * 80 + 30 + index * 44))
      context.fillStyle = inkFaint
      context.font = `500 28px ${token('--font-ui')}`
      context.fillText(`${author} · ${published}`, 90, 1210)
      context.fillText(siteTitle, 90, 1260)
      context.font = `400 22px ${token('--font-ui')}`
      context.fillText(url, 90, 1305)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('blob failed')
      imageUrl = URL.createObjectURL(blob)
      status = 'ready'
    } catch (error) {
      console.warn('[blog] poster generation failed', error)
      status = 'error'
    }
  }

  function show(): void {
    open = true
    void generate()
    queueMicrotask(() => closeButton?.focus())
  }

  function close(): void {
    open = false
    trigger?.focus()
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') close()
  }

  function download(): void {
    if (!imageUrl) return
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = `${title.slice(0, 40) || 'article-share'}.png`
    link.click()
  }
</script>

<button type="button" class="article-share" bind:this={trigger} onclick={show}>
  {t(locale, 'poster.open')}
</button>

{#if open}
  <div class="poster-overlay" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) close() }}>
    <div class="poster-dialog" role="dialog" aria-modal="true" aria-labelledby="poster-title" tabindex="-1" onkeydown={onKeydown}>
      <h2 id="poster-title">{t(locale, 'poster.title')}</h2>
      {#if status === 'working'}
        <p class="poster-status">{t(locale, 'poster.generating')}</p>
      {:else if status === 'error'}
        <p class="poster-status" role="alert">{t(locale, 'poster.failed')}</p>
      {:else if imageUrl}
        <img class="poster-preview" src={imageUrl} alt={t(locale, 'poster.title')} />
      {/if}
      <div class="poster-actions">
        <button type="button" class="chip" bind:this={closeButton} onclick={close}>{t(locale, 'poster.close')}</button>
        {#if imageUrl}
          <button type="button" class="chip" onclick={download}>{t(locale, 'poster.download')}</button>
        {/if}
      </div>
    </div>
  </div>
{/if}
