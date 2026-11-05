<script lang="ts">
  import { onMount } from 'svelte'
  import type { BlogMusicConfig, BlogMusicTrack } from '../../lib/blog-types'
  import PlayerSlider from './PlayerSlider.svelte'

  interface MusicLabels {
    title: string
    play: string
    pause: string
    previous: string
    next: string
    rewind: string
    forward: string
    mode: string
    modeSequence: string
    modeRepeatOne: string
    modeShuffle: string
    progress: string
    volume: string
    mute: string
    unmute: string
    playlist: string
    empty: string
    loading: string
    error: string
    nowPlaying: string
    queueSearch: string
    queueEmpty: string
    queueNoMatch: string
    rate: string
    close: string
    minimize: string
    expand: string
    lyricsEmpty: string
  }

  interface Options {
    music: BlogMusicConfig
    labels: MusicLabels
    locale: string
    emptyMessage: string
  }

  let { options }: { options: Options } = $props()

  const labels = $derived(options.labels)
  const tracks = $derived(options.music.tracks)
  const playable = $derived(options.music.enabled && tracks.length > 0)

  let open = $state(false)
  let collapsed = $state(false)
  let queueOpen = $state(false)
  let index = $state(0)
  let playing = $state(false)
  let loading = $state(false)
  let failed = $state(false)
  let position = $state(0)
  let duration = $state(0)
  let buffered = $state(0)
  let volume = $state(typeof options.music.defaultVolume === 'number' ? options.music.defaultVolume : 0.7)
  let muted = $state(false)
  let rate = $state(1)
  let mode = $state<'sequence' | 'repeat-one' | 'shuffle'>(options.music.defaultMode ?? 'sequence')
  let search = $state('')
  let coverFailed = $state<Record<string, boolean>>({})
  let noteVisible = $state(false)
  let noteTimer: ReturnType<typeof setTimeout> | undefined
  let audio: HTMLAudioElement | null = null
  let loadedId = ''

  const current = $derived(tracks[index] ?? null)
  const total = $derived(duration > 0 ? duration : (current?.duration ?? 0) * 1000)
  const progressValue = $derived(Math.max(0, Math.min(total, position)))
  const modeLabel = $derived(
    mode === 'repeat-one' ? labels.modeRepeatOne : mode === 'shuffle' ? labels.modeShuffle : labels.modeSequence,
  )
  const filteredQueue = $derived.by(() => {
    const query = search.trim().toLowerCase()
    if (!query) return tracks
    return tracks.filter((track) => `${track.title} ${track.artist ?? ''}`.toLowerCase().includes(query))
  })
  const serialized = $derived(JSON.stringify(options))
  const rateSteps = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

  onMount(() => {
    const element = new Audio()
    element.preload = 'metadata'
    element.volume = volume
    element.muted = muted
    element.playbackRate = rate
    element.addEventListener('timeupdate', sync)
    element.addEventListener('durationchange', sync)
    element.addEventListener('progress', sync)
    element.addEventListener('playing', () => { loading = false; playing = true })
    element.addEventListener('pause', () => { playing = false })
    element.addEventListener('waiting', () => { loading = true })
    element.addEventListener('canplay', () => { loading = false })
    element.addEventListener('ended', onEnded)
    element.addEventListener('error', () => { failed = true; loading = false; playing = false })
    audio = element
    return () => {
      element.pause()
      element.removeEventListener('timeupdate', sync)
      element.removeEventListener('durationchange', sync)
      element.removeEventListener('progress', sync)
      element.removeEventListener('ended', onEnded)
      audio = null
    }
  })

  function sync(): void {
    if (!audio) return
    position = audio.currentTime * 1000
    if (Number.isFinite(audio.duration) && audio.duration > 0) duration = audio.duration * 1000
    if (audio.buffered.length > 0) buffered = audio.buffered.end(audio.buffered.length - 1) * 1000
  }

  function ensureSource(): void {
    if (!audio || !current) return
    if (loadedId === current.id) return
    loadedId = current.id
    failed = false
    loading = false
    position = 0
    buffered = 0
    duration = (current.duration ?? 0) * 1000
    audio.src = current.source
    audio.load()
  }

  async function startAudio(): Promise<void> {
    if (!audio || !current) return
    ensureSource()
    loading = true
    try {
      await audio.play()
    } catch {
      failed = true
      playing = false
      loading = false
    }
  }

  function toggle(): void {
    if (!audio || !current) return
    if (playing) audio.pause()
    else void startAudio()
  }

  function selectTrack(track: BlogMusicTrack): void {
    const nextIndex = tracks.findIndex((entry) => entry.id === track.id)
    if (nextIndex < 0) return
    index = nextIndex
    ensureSource()
    void startAudio()
  }

  function next(manual = true): void {
    if (!audio || tracks.length === 0) return
    if (!manual && mode === 'repeat-one') {
      audio.currentTime = 0
      void startAudio()
      return
    }
    if (!manual && mode === 'sequence' && index >= tracks.length - 1) {
      playing = false
      position = total
      return
    }
    const nextIndex = mode === 'shuffle'
      ? randomIndex()
      : (index + 1) % tracks.length
    index = nextIndex
    ensureSource()
    if (!audio.paused || !manual) void startAudio()
  }

  function previous(): void {
    if (!audio || tracks.length === 0) return
    if (position > 3000) {
      seekMs(0)
      return
    }
    index = (index - 1 + tracks.length) % tracks.length
    ensureSource()
    void startAudio()
  }

  function randomIndex(): number {
    if (tracks.length <= 1) return index
    let candidate = index
    while (candidate === index) candidate = Math.floor(Math.random() * tracks.length)
    return candidate
  }

  function onEnded(): void {
    next(false)
  }

  function seekMs(value: number): void {
    if (!audio) return
    const bounded = Math.max(0, Math.min(total, value))
    audio.currentTime = bounded / 1000
    position = bounded
  }

  function seekBy(delta: number): void {
    seekMs(position + delta)
  }

  function setVolume(value: number): void {
    volume = Math.max(0, Math.min(1, value))
    muted = false
    if (audio) {
      audio.volume = volume
      audio.muted = false
    }
  }

  function toggleMute(): void {
    muted = !muted
    if (audio) audio.muted = muted
  }

  function cycleRate(): void {
    const positionInSteps = rateSteps.findIndex((step) => step >= rate - 0.001)
    const nextRate = rateSteps[(positionInSteps + 1) % rateSteps.length] ?? 1
    rate = nextRate
    if (audio) audio.playbackRate = nextRate
  }

  function cycleMode(): void {
    mode = mode === 'sequence' ? 'repeat-one' : mode === 'repeat-one' ? 'shuffle' : 'sequence'
  }

  function openPanel(): void {
    if (!playable) {
      showNote()
      return
    }
    open = true
    collapsed = false
    queueOpen = false
    ensureSource()
  }

  function closePanel(): void {
    if (audio) audio.pause()
    open = false
    collapsed = false
    queueOpen = false
  }

  function showNote(): void {
    noteVisible = true
    if (noteTimer) clearTimeout(noteTimer)
    noteTimer = setTimeout(() => { noteVisible = false }, 9000)
  }

  function panelKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return
    if (queueOpen) queueOpen = false
    else closePanel()
  }

  function formatClock(ms: number): string {
    const seconds = Math.max(0, Math.floor(ms / 1000))
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor(seconds / 60) % 60
    const remainder = seconds % 60
    return hours > 0
      ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
      : `${minutes}:${String(remainder).padStart(2, '0')}`
  }

  function coverOf(track: BlogMusicTrack): string | null {
    return track.cover && !coverFailed[track.id] ? track.cover : null
  }

  function coverFailedFor(track: BlogMusicTrack): void {
    coverFailed = { ...coverFailed, [track.id]: true }
  }
</script>

<div class="blog-music-root" data-blog-music data-playable={playable ? 'true' : 'false'} data-options={serialized}>
  {#if !open}
    <button
      type="button"
      class="blog-music-trigger"
      data-blog-music-trigger
      data-playable={playable ? 'true' : 'false'}
      aria-label={labels.title}
      aria-expanded={false}
      title={labels.title}
      onclick={openPanel}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M9 18V5l12-2v13"></path>
        <circle cx="6" cy="18" r="3"></circle>
        <circle cx="18" cy="16" r="3"></circle>
      </svg>
      <span class="blog-music-trigger__label">{labels.title}</span>
    </button>
  {/if}

  <div class="blog-music-note" data-blog-music-note hidden={!noteVisible} role="status" aria-live="polite">
    <strong>{labels.empty}</strong>
    <span>{options.emptyMessage}</span>
  </div>

  {#if open}
    {#if collapsed}
      <div class="bm-player bm-player--collapsed" role="region" aria-label={labels.title}>
        <button type="button" class="bm-orb" aria-label={labels.expand} onclick={() => { collapsed = false }}>
          <span class="bm-cover bm-cover--orb" aria-hidden="true">
            {#if current && coverOf(current)}
              <img src={coverOf(current) ?? ''} alt="" onerror={() => current && coverFailedFor(current)} />
            {:else}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle>
              </svg>
            {/if}
          </span>
        </button>
        <button type="button" class="bm-orb-toggle" aria-label={playing ? labels.pause : labels.play} onclick={toggle}>
          {#if playing}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
          {:else}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5v14l12-7z" /></svg>
          {/if}
        </button>
      </div>
    {:else}
      <aside class="bm-player" role="region" aria-label={labels.title} onkeydown={panelKeydown}>
        <header class="bm-header">
          <span class="bm-grip" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 9h16M4 15h16" /></svg>
          </span>
          <span class="bm-heading">{labels.nowPlaying}</span>
          <span class={playing ? 'bm-eq bm-eq--playing' : 'bm-eq'} aria-hidden="true">
            {#each [0, 1, 2, 3, 4] as bar (bar)}<span></span>{/each}
          </span>
          <div class="bm-header-actions">
            <button type="button" class="bm-icon" aria-label={labels.minimize} title={labels.minimize} onclick={() => { queueOpen = false; collapsed = true }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 12h12M9 6l-4 6 4 6" /></svg>
            </button>
            <button type="button" class="bm-icon" aria-label={labels.close} title={labels.close} onclick={closePanel}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </button>
          </div>
        </header>

        <div class="bm-identity">
          <span class="bm-cover" aria-hidden="true">
            {#if current && coverOf(current)}
              <img src={coverOf(current) ?? ''} alt="" onerror={() => current && coverFailedFor(current)} />
            {:else}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle>
              </svg>
            {/if}
          </span>
          <span class="bm-text">
            <strong class="bm-title">{current?.title ?? labels.empty}</strong>
            <span class="bm-artist">{current?.artist ?? labels.nowPlaying}</span>
          </span>
        </div>

        <div class="bm-lyrics">
          <span>{labels.lyricsEmpty}</span>
        </div>

        <div class="bm-progress">
          <PlayerSlider
            value={progressValue}
            max={Math.max(1, total)}
            step={1000}
            label={labels.progress}
            valueText={`${formatClock(progressValue)} / ${formatClock(total)}`}
            buffered={buffered}
            onvaluechange={seekMs}
          />
          <div class="bm-times">
            <span>{formatClock(progressValue)}</span>
            <span>{formatClock(total)}</span>
          </div>
        </div>

        {#if loading || failed}
          <p class={failed ? 'bm-status bm-status--error' : 'bm-status'} role="status">
            {failed ? labels.error : labels.loading}
          </p>
        {/if}

        <div class="bm-transport">
          <button type="button" class="bm-icon" aria-label={`${labels.mode}: ${modeLabel}`} title={`${labels.mode}: ${modeLabel}`} aria-pressed={mode !== 'sequence'} onclick={cycleMode}>
            {#if mode === 'shuffle'}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m17 2 4 4-4 4" /><path d="M3 7h14a4 4 0 0 1 4 4" /><path d="m7 22-4-4 4-4" /><path d="M21 17H7a4 4 0 0 1-4-4" /></svg>
            {:else if mode === 'repeat-one'}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m17 2 4 4-4 4" /><path d="M3 7h14a4 4 0 0 1 4 4" /><path d="m7 22-4-4 4-4" /><path d="M21 17H7a4 4 0 0 1-4-4" /><text x="11" y="15" font-size="8" fill="currentColor" stroke="none">1</text></svg>
            {:else}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h13M4 12h13M4 17h13" /><path d="m14 4 3 3-3 3" /></svg>
            {/if}
          </button>
          <button type="button" class="bm-icon bm-icon--step" aria-label={labels.previous} title={labels.previous} onclick={previous}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h2v14H6zM20 5v14l-10-7z" /></svg>
          </button>
          <button type="button" class="bm-icon" aria-label={labels.rewind} title={labels.rewind} onclick={() => seekBy(-10_000)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M11 19V5l-9 7zM21 19V5l-9 7z" /></svg>
          </button>
          <button type="button" class={playing ? 'bm-play bm-play--active' : 'bm-play'} aria-label={playing ? labels.pause : labels.play} title={playing ? labels.pause : labels.play} aria-pressed={playing} onclick={toggle}>
            {#if loading}
              <span class="bm-spinner" aria-hidden="true"></span>
            {:else if playing}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
            {:else}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5v14l12-7z" /></svg>
            {/if}
          </button>
          <button type="button" class="bm-icon" aria-label={labels.forward} title={labels.forward} onclick={() => seekBy(10_000)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M13 5v14l9-7zM3 5v14l9-7z" /></svg>
          </button>
          <button type="button" class="bm-icon bm-icon--step" aria-label={labels.next} title={labels.next} onclick={() => next(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 5h2v14h-2zM4 5v14l10-7z" /></svg>
          </button>
          <button type="button" class="bm-icon bm-icon--queue" aria-label={labels.playlist} title={labels.playlist} aria-expanded={queueOpen} onclick={() => { queueOpen = !queueOpen }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1" /><circle cx="3.5" cy="12" r="1" /><circle cx="3.5" cy="18" r="1" /></svg>
            <span class="bm-badge" aria-hidden="true">{tracks.length}</span>
          </button>
        </div>

        <div class="bm-footer">
          <button type="button" class="bm-icon" aria-label={muted ? labels.unmute : labels.mute} title={muted ? labels.unmute : labels.mute} onclick={toggleMute}>
            {#if muted}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9zM16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="1.8" /></svg>
            {:else}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9zM16 8a5 5 0 0 1 0 8" stroke="currentColor" stroke-width="1.8" fill="none" /></svg>
            {/if}
          </button>
          <button type="button" class="bm-rate" aria-label={`${labels.rate} ${rate}`} title={`${labels.rate} ${rate}`} onclick={cycleRate}>{rate}×</button>
          <div class="bm-volume">
            <PlayerSlider
              value={muted ? 0 : volume}
              max={1}
              step={0.01}
              label={labels.volume}
              valueText={`${Math.round((muted ? 0 : volume) * 100)}%`}
              onvaluechange={setVolume}
            />
          </div>
        </div>

        {#if queueOpen}
          <div class="bm-queue">
            <div class="bm-queue-head">
              <span>{labels.playlist}</span>
              <button type="button" class="bm-icon" aria-label={labels.close} title={labels.close} onclick={() => { queueOpen = false }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
              </button>
            </div>
            <label class="bm-search">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input type="search" bind:value={search} placeholder={labels.queueSearch} aria-label={labels.queueSearch} />
            </label>
            {#if filteredQueue.length === 0}
              <p class="bm-queue-empty">
                {search.trim() ? labels.queueNoMatch : labels.queueEmpty}
              </p>
            {:else}
              <ul class="bm-queue-list">
                {#each filteredQueue as track, rowIndex (track.id)}
                  {@const isCurrent = current?.id === track.id}
                  <li>
                    <button
                      type="button"
                      class={isCurrent ? 'bm-queue-row bm-queue-row--current' : 'bm-queue-row'}
                      aria-current={isCurrent ? 'true' : undefined}
                      onclick={() => selectTrack(track)}
                    >
                      <span class="bm-queue-index" aria-hidden="true">{rowIndex + 1}</span>
                      <span class="bm-queue-cover" aria-hidden="true">
                        {#if coverOf(track)}
                          <img src={coverOf(track) ?? ''} alt="" loading="lazy" onerror={() => coverFailedFor(track)} />
                        {:else}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                            <path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle>
                          </svg>
                        {/if}
                      </span>
                      <span class="bm-queue-text">
                        <span class="bm-queue-title">{track.title}</span>
                        <span class="bm-queue-artist">{track.artist ?? labels.nowPlaying}</span>
                      </span>
                      <span class="bm-queue-time">{formatClock((track.duration ?? 0) * 1000)}</span>
                    </button>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        {/if}
      </aside>
    {/if}
  {/if}
</div>

<style>
  .blog-music-root {
    display: contents;
  }

  .bm-player {
    position: fixed;
    z-index: var(--z-drawer);
    right: 16px;
    bottom: 16px;
    display: flex;
    width: min(340px, calc(100vw - 24px));
    flex-direction: column;
    gap: var(--sp-2);
    padding: var(--sp-3);
    border: 1px solid var(--border-default);
    border-radius: 18px;
    background: var(--bg-overlay);
    box-shadow: var(--shadow-modal);
    color: var(--text-primary);
  }

  .bm-player--collapsed {
    width: auto;
    padding: 0;
    overflow: hidden;
    border-radius: var(--r-full);
  }

  .bm-orb {
    display: block;
    width: 60px;
    height: 60px;
    padding: 0;
    border: 0;
    border-radius: var(--r-full);
    background: var(--bg-raised);
    color: var(--text-tertiary);
    cursor: pointer;
  }

  .bm-cover--orb,
  .bm-cover--orb img {
    inline-size: 100%;
    block-size: 100%;
    width: 100%;
    height: 100%;
    border-radius: var(--r-full);
  }

  .bm-orb-toggle {
    position: absolute;
    right: 2px;
    bottom: 2px;
    display: grid;
    width: 22px;
    height: 22px;
    place-items: center;
    border: 1px solid var(--border-default);
    border-radius: var(--r-full);
    background: var(--bg-overlay);
    color: var(--accent);
    cursor: pointer;
  }

  .bm-player--collapsed {
    position: fixed;
  }

  .bm-header {
    display: flex;
    min-block-size: 24px;
    align-items: center;
    gap: var(--sp-1);
  }

  .bm-grip {
    display: inline-flex;
    color: var(--text-quaternary);
  }

  .bm-heading {
    color: var(--text-tertiary);
    font-size: var(--text-10-5);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .bm-eq {
    display: inline-flex;
    block-size: 12px;
    align-items: flex-end;
    gap: 2px;
    margin-inline-start: 6px;
  }

  .bm-eq span {
    inline-size: 2px;
    block-size: 100%;
    border-radius: var(--r-full);
    background: var(--accent);
    transform: scaleY(0.3);
    transform-origin: bottom;
  }

  .bm-eq--playing span {
    animation: bm-eq 880ms ease-in-out infinite alternate;
  }

  .bm-eq--playing span:nth-child(2) { animation-delay: 120ms; animation-duration: 740ms; }
  .bm-eq--playing span:nth-child(3) { animation-delay: 260ms; animation-duration: 980ms; }
  .bm-eq--playing span:nth-child(4) { animation-delay: 80ms; animation-duration: 820ms; }
  .bm-eq--playing span:nth-child(5) { animation-delay: 320ms; animation-duration: 700ms; }

  @keyframes bm-eq {
    from { transform: scaleY(0.25); }
    to { transform: scaleY(1); }
  }

  @media (prefers-reduced-motion: reduce) {
    .bm-eq--playing span { animation: none; transform: scaleY(0.55); }
  }

  .bm-header-actions {
    display: flex;
    margin-inline-start: auto;
    gap: 2px;
  }

  .bm-identity {
    display: flex;
    min-inline-size: 0;
    align-items: center;
    gap: var(--sp-2);
  }

  .bm-cover {
    display: grid;
    inline-size: 46px;
    block-size: 46px;
    flex: none;
    place-items: center;
    overflow: hidden;
    border-radius: var(--r-full);
    background: linear-gradient(135deg, var(--accent-soft), var(--bg-raised));
    color: var(--accent);
  }

  .bm-cover img,
  .bm-queue-cover img {
    inline-size: 100%;
    block-size: 100%;
    object-fit: cover;
  }

  .bm-text {
    display: flex;
    min-inline-size: 0;
    flex: 1;
    flex-direction: column;
    gap: 1px;
  }

  .bm-title {
    overflow: hidden;
    color: var(--text-primary);
    font-size: var(--text-13);
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bm-artist {
    overflow: hidden;
    color: var(--text-tertiary);
    font-size: var(--text-11);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bm-lyrics {
    display: -webkit-box;
    max-height: 36px;
    overflow: hidden;
    padding: var(--sp-2) var(--sp-2-5);
    border-radius: var(--r-md);
    background: var(--bg-surface);
    color: var(--text-tertiary);
    font-size: var(--text-11-5);
    line-height: 1.5;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }

  .bm-progress {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .bm-times {
    display: flex;
    justify-content: space-between;
    color: var(--text-quaternary);
    font-size: var(--text-10-5);
    font-variant-numeric: tabular-nums;
  }

  .bm-status {
    margin: 0;
    color: var(--text-tertiary);
    font-size: var(--text-11);
    text-align: center;
  }

  .bm-status--error { color: var(--danger); }

  .bm-transport {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-0-5);
    padding-block: var(--sp-1);
  }

  .bm-play {
    display: grid;
    width: 46px;
    height: 46px;
    flex: none;
    place-items: center;
    border: 0;
    border-radius: var(--r-full);
    background: var(--accent);
    color: var(--on-accent, var(--text-primary));
    cursor: pointer;
    box-shadow: var(--shadow-sm);
    transition: transform 140ms ease, background 140ms ease;
  }

  .bm-play:hover { transform: scale(1.04); }
  .bm-play--active { background: var(--accent-hover, var(--accent)); }

  .bm-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--accent-ring);
    border-top-color: var(--bg-overlay);
    border-radius: var(--r-full);
    animation: bm-spin 700ms linear infinite;
  }

  @keyframes bm-spin { to { transform: rotate(360deg); } }

  .bm-icon {
    position: relative;
    display: inline-grid;
    width: 30px;
    height: 30px;
    flex: none;
    place-items: center;
    border: 0;
    border-radius: var(--r-full);
    background: transparent;
    color: var(--text-tertiary);
    cursor: pointer;
    transition: background 140ms ease, color 140ms ease;
  }

  .bm-icon:hover,
  .bm-icon:focus-visible {
    background: var(--bg-raised);
    color: var(--text-primary);
  }

  .bm-icon[aria-pressed='true'] { color: var(--accent); }

  .bm-icon--step { width: 34px; height: 34px; }

  .bm-icon--queue { width: auto; padding-inline: 6px; gap: 2px; display: inline-flex; }

  .bm-badge {
    min-inline-size: 15px;
    padding-inline: 3px;
    border-radius: var(--r-full);
    background: var(--bg-raised);
    color: var(--text-quaternary);
    font-size: var(--text-10);
    line-height: 15px;
    text-align: center;
  }

  .bm-footer {
    display: flex;
    align-items: center;
    gap: var(--sp-1-5);
  }

  .bm-rate {
    flex: none;
    padding: 2px 7px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-full);
    background: var(--bg-raised);
    color: var(--text-tertiary);
    font-size: var(--text-11);
    font-variant-numeric: tabular-nums;
    cursor: pointer;
  }

  .bm-rate:hover { border-color: var(--border-default); color: var(--text-primary); }

  .bm-volume { flex: 1; min-inline-size: 0; }

  .bm-queue {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1-5);
    padding-top: var(--sp-2);
    border-top: 1px solid var(--border-subtle);
  }

  .bm-queue-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: var(--text-secondary);
    font-size: var(--text-12);
    font-weight: 600;
  }

  .bm-search {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--sp-1-5);
    padding: 3px var(--sp-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-md);
    background: var(--bg-surface);
    color: var(--text-quaternary);
  }

  .bm-search:focus-within {
    border-color: var(--accent);
    box-shadow: var(--shadow-ring-focus);
  }

  .bm-search input {
    width: 100%;
    min-inline-size: 0;
    border: 0;
    background: transparent;
    color: var(--text-primary);
    font-size: var(--text-12);
    outline: none;
  }

  .bm-search input::placeholder { color: var(--text-quaternary); }

  .bm-queue-empty {
    margin: 0;
    padding: var(--sp-3) var(--sp-2);
    color: var(--text-tertiary);
    font-size: var(--text-11-5);
    text-align: center;
  }

  .bm-queue-list {
    max-height: 220px;
    margin: 0;
    padding: 0;
    overflow: auto;
    list-style: none;
  }

  .bm-queue-row {
    display: grid;
    width: 100%;
    grid-template-columns: 18px 30px minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--sp-1-5);
    padding: var(--sp-1-5);
    border: 1px solid transparent;
    border-radius: var(--r-md);
    background: transparent;
    color: var(--text-primary);
    text-align: left;
    cursor: pointer;
    transition: background 120ms ease, border-color 120ms ease;
  }

  .bm-queue-row:hover { background: var(--bg-raised); }

  .bm-queue-row--current {
    border-color: var(--accent-ring);
    background: var(--accent-soft);
  }

  .bm-queue-index {
    color: var(--text-quaternary);
    font-size: var(--text-10);
    font-variant-numeric: tabular-nums;
    text-align: center;
  }

  .bm-queue-cover {
    display: grid;
    inline-size: 30px;
    block-size: 30px;
    place-items: center;
    overflow: hidden;
    border-radius: var(--r-sm);
    background: linear-gradient(135deg, var(--accent-soft), var(--bg-raised));
    color: var(--accent);
  }

  .bm-queue-text {
    display: flex;
    min-inline-size: 0;
    flex-direction: column;
    gap: 1px;
  }

  .bm-queue-title {
    overflow: hidden;
    font-size: var(--text-12);
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bm-queue-artist {
    overflow: hidden;
    color: var(--text-tertiary);
    font-size: var(--text-10-5);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bm-queue-time {
    color: var(--text-quaternary);
    font-size: var(--text-10-5);
    font-variant-numeric: tabular-nums;
  }

  button:focus-visible {
    outline: none;
    box-shadow: var(--shadow-ring-focus);
  }

  @media (max-width: 640px) {
    .bm-player {
      right: 8px;
      bottom: 8px;
      left: 8px;
      width: auto;
      max-height: calc(100dvh - 16px);
      padding: var(--sp-3);
    }

    .bm-player--collapsed {
      right: 8px;
      bottom: 8px;
      left: auto;
      width: auto;
    }

    .bm-queue-list { max-height: 38vh; }
    .bm-play { width: 48px; height: 48px; }
  }
</style>
