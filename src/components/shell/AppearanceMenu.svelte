<script lang="ts">
  import { onMount } from 'svelte'
  import { t, type BlogLocale } from '../../i18n'

  let { locale, defaultHue = 315, defaultStyle = 'tonalSpot', defaultSpec = '2025' }: {
    locale: BlogLocale
    defaultHue?: number
    defaultStyle?: string
    defaultSpec?: '2025' | '2021'
  } = $props()
  type Theme = 'auto' | 'light' | 'dark'
  type Accent = 'cinnabar' | 'indigo' | 'celadon' | 'amber' | 'terracotta' | 'wisteria' | 'graphite'
  type Background = 'paper' | 'white'
  type Density = 'comfortable' | 'compact'

  const accents: { id: Accent; color: string }[] = [
    { id: 'cinnabar', color: '#d9543c' },
    { id: 'indigo', color: '#3b6fd4' },
    { id: 'celadon', color: '#2f9b5f' },
    { id: 'amber', color: '#d6a000' },
    { id: 'terracotta', color: '#2196a6' },
    { id: 'wisteria', color: '#8b5cf6' },
    { id: 'graphite', color: '#6b7280' },
  ]

  let theme = $state<Theme>('auto')
  let accent = $state<Accent>('cinnabar')
  let background = $state<Background>('paper')
  let density = $state<Density>('comfortable')
  type LayoutMode = 'list' | 'grid' | 'masonry'
  let layout = $state<LayoutMode>('list')
  type McStyle = 'tonalSpot' | 'vibrant' | 'expressive' | 'fidelity' | 'content' | 'monochrome' | 'neutral' | 'rainbow' | 'fruitSalad'
  type Texture = 'none' | 'starlight' | 'cyber_dots' | 'topography' | 'geometric' | 'sakura'
  const styles: { id: McStyle; chroma: number; offset: number; secondaryChroma: number }[] = [
    { id: 'tonalSpot', chroma: 0.13, offset: 60, secondaryChroma: 0.08 },
    { id: 'vibrant', chroma: 0.19, offset: 45, secondaryChroma: 0.12 },
    { id: 'expressive', chroma: 0.17, offset: 120, secondaryChroma: 0.14 },
    { id: 'fidelity', chroma: 0.15, offset: 0, secondaryChroma: 0.1 },
    { id: 'content', chroma: 0.12, offset: 30, secondaryChroma: 0.08 },
    { id: 'monochrome', chroma: 0.02, offset: 0, secondaryChroma: 0.005 },
    { id: 'neutral', chroma: 0.015, offset: 0, secondaryChroma: 0.01 },
    { id: 'rainbow', chroma: 0.16, offset: 150, secondaryChroma: 0.15 },
    { id: 'fruitSalad', chroma: 0.15, offset: 100, secondaryChroma: 0.15 },
  ]
  const textures: Texture[] = ['none', 'starlight', 'cyber_dots', 'topography', 'geometric', 'sakura']
  let hue = $state(defaultHue)
  let m3Style = $state<McStyle>(styles.some((item) => item.id === defaultStyle) ? defaultStyle as McStyle : 'tonalSpot')
  let m3Spec = $state<'2025' | '2021'>(defaultSpec === '2021' ? '2021' : '2025')
  let texture = $state<Texture>('none')
  let wallpaper = $state<'plain' | 'banner'>('plain')
  let reduceMotion = $state(false)
  let m3Enabled = $state(false)
  let prefersDark = $state(false)

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

  const M3_VARS = [
    ['--primary', 'm3-primary'],
    ['--primary-container', 'm3-primary-container'],
    ['--on-primary', 'm3-on-primary'],
    ['--on-primary-container', 'm3-on-primary-container'],
    ['--secondary', 'm3-secondary'],
  ] as const

  function applyPalette(persist = true) {
    const style = styles.find((item) => item.id === m3Style) ?? styles[0]!
    const root = document.documentElement
    const dark = root.classList.contains('dark')
    const chroma = style.chroma * (m3Spec === '2021' ? 0.88 : 1)
    const lightness = dark ? 0.72 : 0.52
    const values: Record<string, string> = {
      '--primary': `oklch(${lightness} ${chroma} ${hue})`,
      '--primary-container': dark ? `oklch(0.38 0.1 ${hue})` : `oklch(0.91 0.055 ${hue})`,
      '--on-primary': dark ? `oklch(0.2 0.06 ${hue})` : `oklch(0.99 0.01 ${hue})`,
      '--on-primary-container': dark ? `oklch(0.92 0.05 ${hue})` : `oklch(0.3 0.1 ${hue})`,
      '--secondary': `oklch(${dark ? 0.84 : 0.46} ${style.secondaryChroma} ${(hue + style.offset) % 360})`,
    }
    for (const [variable, key] of M3_VARS) {
      root.style.setProperty(variable, values[variable]!)
      if (persist) localStorage.setItem(key, values[variable]!)
    }
    root.dataset.m3Style = m3Style
    root.dataset.m3Spec = m3Spec
    m3Enabled = true
  }

  function clearPalette() {
    const root = document.documentElement
    for (const [variable, key] of M3_VARS) {
      root.style.removeProperty(variable)
      localStorage.removeItem(key)
    }
    root.removeAttribute('data-m3-style')
    root.removeAttribute('data-m3-spec')
    m3Enabled = false
  }

  function setHue(next: number) {
    hue = Math.min(360, Math.max(0, Math.round(next)))
    localStorage.setItem('hue', String(hue))
    document.documentElement.style.setProperty('--hue', String(hue))
    if (m3Enabled) applyPalette()
  }

  function setMcStyle(next: McStyle) {
    m3Style = next
    localStorage.setItem('m3-style', next)
    applyPalette()
  }

  function setSpec(next: '2025' | '2021') {
    m3Spec = next
    localStorage.setItem('m3-spec', next)
    applyPalette()
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
    const storedTheme = localStorage.getItem('theme')
    theme = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'auto'
    const storedAccent = localStorage.getItem('accent')
    if (accents.some((item) => item.id === storedAccent)) accent = storedAccent as Accent
    const storedBackground = localStorage.getItem('background')
    background = storedBackground === 'white' ? 'white' : 'paper'
    density = localStorage.getItem('density') === 'compact' ? 'compact' : 'comfortable'
    const storedHueRaw = localStorage.getItem('hue')
    const storedHue = Number(storedHueRaw)
    if (storedHueRaw !== null && Number.isFinite(storedHue) && storedHue >= 0 && storedHue <= 360) hue = Math.round(storedHue)
    const storedStyle = localStorage.getItem('m3-style')
    if (styles.some((item) => item.id === storedStyle)) m3Style = storedStyle as McStyle
    else if (styles.some((item) => item.id === defaultStyle)) m3Style = defaultStyle as McStyle
    m3Spec = localStorage.getItem('m3-spec') === '2021' ? '2021' : defaultSpec === '2021' ? '2021' : '2025'
    const storedTexture = localStorage.getItem('texture')
    if (textures.includes(storedTexture as Texture)) texture = storedTexture as Texture
    wallpaper = localStorage.getItem('wallpaper') === 'banner' ? 'banner' : 'plain'
    reduceMotion = localStorage.getItem('reduce-motion') === '1'
    m3Enabled = Boolean(localStorage.getItem('m3-primary'))
    if (!m3Enabled) applyPalette(false)
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
      if (theme === 'auto') {
        applyTheme('auto')
        if (m3Enabled) applyPalette(localStorage.getItem('m3-style') !== null)
      }
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
    if (m3Enabled) applyPalette(localStorage.getItem('m3-style') !== null)
  }

  function setAccent(next: Accent) {
    accent = next
    clearPalette()
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
      <label class="appearance-label" for="appearance-hue">{t(locale, 'appearance.hue')} · {hue}</label>
      <input id="appearance-hue" class="appearance-hue" type="range" min="0" max="360" value={hue} oninput={(event) => setHue(Number(event.currentTarget.value))} />
    </section>
    <section>
      <p class="appearance-label">{t(locale, 'appearance.color_style')}</p>
      <div class="appearance-style-grid" role="group" aria-label={t(locale, 'appearance.color_style')}>
        {#each styles as item}
          <button
            type="button"
            class="appearance-style"
            aria-pressed={m3Style === item.id}
            onclick={() => setMcStyle(item.id)}
            title={t(locale, `appearance.style_${item.id}`)}
            style={`--swatch:oklch(0.62 ${item.chroma} ${hue});--swatch-2:oklch(0.75 ${item.secondaryChroma} ${(hue + item.offset) % 360})`}
          >
            <span aria-hidden="true"></span>
            {t(locale, `appearance.style_${item.id}`)}
          </button>
        {/each}
      </div>
    </section>
    <section>
      <p class="appearance-label">{t(locale, 'appearance.spec')}</p>
      <div class="appearance-segment" role="group" aria-label={t(locale, 'appearance.spec')}>
        <button type="button" aria-pressed={m3Spec === '2025'} onclick={() => setSpec('2025')}>{t(locale, 'appearance.spec_2025')}</button>
        <button type="button" aria-pressed={m3Spec === '2021'} onclick={() => setSpec('2021')}>{t(locale, 'appearance.spec_2021')}</button>
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
      <p class="appearance-label">{t(locale, 'appearance.accent')}</p>
      <div class="appearance-swatches" role="group" aria-label={t(locale, 'appearance.accent')}>
        {#each accents as item}
          <button
            type="button"
            class="appearance-swatch"
            style={`--swatch:${item.color}`}
            aria-pressed={accent === item.id}
            aria-label={t(locale, `appearance.accent_${item.id}`)}
            title={t(locale, `appearance.accent_${item.id}`)}
            onclick={() => setAccent(item.id)}
          ></button>
        {/each}
      </div>
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
