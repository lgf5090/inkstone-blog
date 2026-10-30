<script lang="ts">
  import { onMount } from 'svelte'
  import { t, type BlogLocale } from '../../i18n'

  let { locale }: { locale: BlogLocale } = $props()
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

  onMount(() => {
    const storedTheme = localStorage.getItem('theme')
    theme = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'auto'
    const storedAccent = localStorage.getItem('accent')
    if (accents.some((item) => item.id === storedAccent)) accent = storedAccent as Accent
    const storedBackground = localStorage.getItem('background')
    background = storedBackground === 'white' ? 'white' : 'paper'
    density = localStorage.getItem('density') === 'compact' ? 'compact' : 'comfortable'
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
  </div>
</details>
