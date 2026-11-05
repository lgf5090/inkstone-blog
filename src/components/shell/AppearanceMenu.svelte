<script lang="ts">
  import { onMount } from 'svelte'
  import { t, type BlogLocale } from '../../i18n'

  let { locale }: { locale: BlogLocale } = $props()
  type Theme = 'auto' | 'light' | 'dark'
  type Accent = 'cinnabar' | 'indigo' | 'celadon' | 'amber' | 'terracotta' | 'wisteria' | 'graphite'
  type Background = 'paper' | 'white'
  type Density = 'comfortable' | 'compact'

  // The same seven accents Inkstone ships as `[data-accent]` tokens. The swatch
  // itself reads the accent token so the panel never hardcodes a colour.
  const accents: Accent[] = ['cinnabar', 'indigo', 'celadon', 'amber', 'terracotta', 'wisteria', 'graphite']

  let theme = $state<Theme>('auto')
  let accent = $state<Accent>('cinnabar')
  let background = $state<Background>('paper')
  let density = $state<Density>('comfortable')
  type LayoutMode = 'list' | 'grid' | 'masonry'
  let layout = $state<LayoutMode>('list')
  type Texture = 'none' | 'starlight' | 'cyber_dots' | 'topography' | 'geometric' | 'sakura'
  const textures: Texture[] = ['none', 'starlight', 'cyber_dots', 'topography', 'geometric', 'sakura']
  let texture = $state<Texture>('none')
  let wallpaper = $state<'plain' | 'banner'>('plain')
  let reduceMotion = $state(false)
  let prefersDark = $state(false)

  // Older builds stored a generated Material palette under these keys and wrote
  // it straight onto the root element, which would shadow the Inkstone accent
  // tokens forever. They are cleared once so the curated palette governs again.
  const LEGACY_KEYS = ['hue', 'm3-primary', 'm3-primary-container', 'm3-on-primary', 'm3-on-primary-container', 'm3-secondary', 'm3-style', 'm3-spec']
  const LEGACY_VARS = ['--primary', '--primary-container', '--on-primary', '--on-primary-container', '--secondary', '--hue']

  function applyTheme(next: Theme) {
    const dark = next === 'dark' || (next === 'auto' && prefersDark)
    const root = document.documentElement
    root.classList.toggle('dark', dark)
    root.classList.toggle('light', !dark)
    root.dataset.theme = dark ? 'dark' : 'light'
  }

  function persist() {
    localStorage.setItem('theme', theme)
    localStorage.setItem('accent', accent)
    localStorage.setItem('background', background)
    localStorage.setItem('density', density)
    const root = document.documentElement
    root.dataset.accent = accent
    root.dataset.background = background
    root.dataset.density = density
    applyTheme(theme)
  }

  function setTexture(next: Texture) {
    texture = next
    document.documentElement.dataset.texture = next
    localStorage.setItem('texture', next)
  }

  function setWallpaper(next: 'plain' | 'banner') {
    wallpaper = next
    document.documentElement.dataset.wallpaper = next
    localStorage.setItem('wallpaper', next)
  }

  function setReduceMotion(next: boolean) {
    reduceMotion = next
    document.documentElement.dataset.reduceMotion = next ? 'true' : 'false'
    localStorage.setItem('reduce-motion', next ? '1' : '0')
  }

  onMount(() => {
    for (const key of LEGACY_KEYS) localStorage.removeItem(key)
    for (const name of LEGACY_VARS) document.documentElement.style.removeProperty(name)
    document.documentElement.removeAttribute('data-m3-style')
    document.documentElement.removeAttribute('data-m3-spec')

    const storedTheme = localStorage.getItem('theme')
    theme = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'auto'
    const storedAccent = localStorage.getItem('accent') as Accent | null
    if (storedAccent && accents.includes(storedAccent)) accent = storedAccent
    background = localStorage.getItem('background') === 'white' ? 'white' : 'paper'
    density = localStorage.getItem('density') === 'compact' ? 'compact' : 'comfortable'
    const storedTexture = localStorage.getItem('texture')
    if (textures.includes(storedTexture as Texture)) texture = storedTexture as Texture
    wallpaper = localStorage.getItem('wallpaper') === 'banner' ? 'banner' : 'plain'
    reduceMotion = localStorage.getItem('reduce-motion') === '1'
    document.documentElement.dataset.texture = texture
    document.documentElement.dataset.wallpaper = wallpaper
    document.documentElement.dataset.reduceMotion = reduceMotion ? 'true' : 'false'
    const modes = ['list', 'grid', 'masonry'] as const
    const storedMode = localStorage.getItem('post-list-mode')
    const serverMode = document.querySelector('[data-post-list]')?.getAttribute('data-mode')
    const initial = modes.find((mode) => mode === storedMode) ?? modes.find((mode) => mode === serverMode)
    if (initial) layout = initial
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    prefersDark = media.matches
    media.addEventListener('change', () => {
      prefersDark = media.matches
      if (theme === 'auto') applyTheme('auto')
    })
    rootDataset()
  })

  function rootDataset() {
    const root = document.documentElement
    root.dataset.accent = accent
    root.dataset.background = background
    root.dataset.density = density
    applyTheme(theme)
  }

  function setTheme(next: Theme) {
    theme = next
    persist()
  }

  function setAccent(next: Accent) {
    accent = next
    persist()
  }

  function setBackground(next: Background) {
    background = next
    persist()
  }

  function setDensity(next: Density) {
    density = next
    persist()
  }

  function setLayout(next: LayoutMode) {
    layout = next
    localStorage.setItem('post-list-mode', next)
    ;(window as unknown as { __blogApplyPostListMode?: (mode: string) => void }).__blogApplyPostListMode?.(next)
  }
</script>

<details class="nav-menu appearance-menu">
  <summary class="icon-button" aria-label={t(locale, 'appearance.title')} title={t(locale, 'appearance.title')}>
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9"></circle>
      <path d="M12 3a9 9 0 0 0 0 18V3Z" fill="currentColor" stroke="none"></path>
    </svg>
  </summary>
  <div class="nav-menu-panel appearance-panel">
    <section>
      <p class="appearance-label">{t(locale, 'appearance.theme')}</p>
      <div class="appearance-segment" role="group" aria-label={t(locale, 'appearance.theme')}>
        <button type="button" aria-pressed={theme === 'auto'} onclick={() => setTheme('auto')}>{t(locale, 'appearance.theme_auto')}</button>
        <button type="button" aria-pressed={theme === 'light'} onclick={() => setTheme('light')}>{t(locale, 'appearance.theme_light')}</button>
        <button type="button" aria-pressed={theme === 'dark'} onclick={() => setTheme('dark')}>{t(locale, 'appearance.theme_dark')}</button>
      </div>
    </section>
    <section>
      <p class="appearance-label">{t(locale, 'appearance.accent')}</p>
      <div class="appearance-swatches" role="group" aria-label={t(locale, 'appearance.accent')}>
        {#each accents as item}
          <button
            type="button"
            class="appearance-swatch appearance-swatch--{item}"
            class:is-active={accent === item}
            aria-pressed={accent === item}
            aria-label={t(locale, `appearance.accent_${item}`)}
            title={t(locale, `appearance.accent_${item}`)}
            onclick={() => setAccent(item)}
          ></button>
        {/each}
      </div>
    </section>
    <section>
      <p class="appearance-label">{t(locale, 'appearance.wallpaper')}</p>
      <div class="appearance-segment" role="group" aria-label={t(locale, 'appearance.wallpaper')}>
        <button type="button" aria-pressed={wallpaper === 'plain'} onclick={() => setWallpaper('plain')}>{t(locale, 'appearance.wallpaper_plain')}</button>
        <button type="button" aria-pressed={wallpaper === 'banner'} onclick={() => setWallpaper('banner')}>{t(locale, 'appearance.wallpaper_banner')}</button>
      </div>
    </section>
    <section>
      <p class="appearance-label">{t(locale, 'appearance.texture')}</p>
      <div class="appearance-segment appearance-texture" role="group" aria-label={t(locale, 'appearance.texture')}>
        {#each textures as item}
          <button type="button" aria-pressed={texture === item} onclick={() => setTexture(item)}>{t(locale, `appearance.texture_${item}`)}</button>
        {/each}
      </div>
    </section>
    <section>
      <button type="button" class="appearance-motion" aria-pressed={reduceMotion} onclick={() => setReduceMotion(!reduceMotion)}>
        {t(locale, 'appearance.reduce_motion')}
      </button>
    </section>
    <section>
      <p class="appearance-label">{t(locale, 'appearance.background')}</p>
      <div class="appearance-segment" role="group" aria-label={t(locale, 'appearance.background')}>
        <button type="button" aria-pressed={background === 'paper'} onclick={() => setBackground('paper')}>{t(locale, 'appearance.background_paper')}</button>
        <button type="button" aria-pressed={background === 'white'} onclick={() => setBackground('white')}>{t(locale, 'appearance.background_white')}</button>
      </div>
    </section>
    <section>
      <p class="appearance-label">{t(locale, 'appearance.density')}</p>
      <div class="appearance-segment" role="group" aria-label={t(locale, 'appearance.density')}>
        <button type="button" aria-pressed={density === 'comfortable'} onclick={() => setDensity('comfortable')}>{t(locale, 'appearance.density_comfortable')}</button>
        <button type="button" aria-pressed={density === 'compact'} onclick={() => setDensity('compact')}>{t(locale, 'appearance.density_compact')}</button>
      </div>
    </section>
    <section>
      <p class="appearance-label">{t(locale, 'appearance.layout')}</p>
      <div class="appearance-segment" role="group" aria-label={t(locale, 'appearance.layout')}>
        <button type="button" aria-pressed={layout === 'list'} onclick={() => setLayout('list')}>{t(locale, 'appearance.layout_list')}</button>
        <button type="button" aria-pressed={layout === 'grid'} onclick={() => setLayout('grid')}>{t(locale, 'appearance.layout_grid')}</button>
        <button type="button" aria-pressed={layout === 'masonry'} onclick={() => setLayout('masonry')}>{t(locale, 'appearance.layout_masonry')}</button>
      </div>
    </section>
  </div>
</details>
