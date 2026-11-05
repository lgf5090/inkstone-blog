<script lang="ts">
  type Props = {
    value: number
    min?: number
    max: number
    step?: number
    label: string
    valueText?: string
    buffered?: number
    onvaluechange: (value: number) => void
  }

  let {
    value,
    min = 0,
    max,
    step = 1,
    label,
    valueText,
    buffered,
    onvaluechange,
  }: Props = $props()

  let track = $state<HTMLDivElement>()
  let dragging = $state(false)

  const span = $derived(Math.max(1, max - min))
  const percent = $derived(clamp((value - min) / span) * 100)
  const bufferedPercent = $derived(buffered === undefined ? 0 : clamp((buffered - min) / span) * 100)

  function clamp(ratio: number): number {
    return Math.max(0, Math.min(1, ratio))
  }

  function emitFromPointer(event: PointerEvent): void {
    const element = track
    if (!element) return
    const rect = element.getBoundingClientRect()
    if (rect.width <= 0) return
    const ratio = clamp((event.clientX - rect.left) / rect.width)
    onvaluechange(min + ratio * span)
  }

  function down(event: PointerEvent): void {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    dragging = true
    track?.setPointerCapture(event.pointerId)
    emitFromPointer(event)
  }

  function move(event: PointerEvent): void {
    if (!dragging) return
    emitFromPointer(event)
  }

  function up(event: PointerEvent): void {
    if (!dragging) return
    dragging = false
    if (track?.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId)
  }

  function keydown(event: KeyboardEvent): void {
    const large = Math.max(step, span / 10)
    let next: number | null = null
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = value + step
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = value - step
    else if (event.key === 'PageUp') next = value + large
    else if (event.key === 'PageDown') next = value - large
    else if (event.key === 'Home') next = min
    else if (event.key === 'End') next = max
    if (next === null) return
    event.preventDefault()
    onvaluechange(Math.max(min, Math.min(max, next)))
  }
</script>

<div
  class="bm-slider"
  class:bm-slider--dragging={dragging}
  role="slider"
  tabindex="0"
  aria-label={label}
  aria-valuemin={min}
  aria-valuemax={max}
  aria-valuenow={value}
  aria-valuetext={valueText}
  onpointerdown={down}
  onpointermove={move}
  onpointerup={up}
  onpointercancel={up}
  onkeydown={keydown}
>
  <div class="bm-slider__track" bind:this={track}>
    <div class="bm-slider__buffered" style:width={`${bufferedPercent}%`}></div>
    <div class="bm-slider__fill" style:width={`${percent}%`}></div>
    <span class="bm-slider__thumb" style:left={`${percent}%`} aria-hidden="true"></span>
  </div>
</div>

<style>
  .bm-slider {
    display: flex;
    height: 22px;
    align-items: center;
    cursor: pointer;
    touch-action: none;
    outline: none;
  }

  .bm-slider__track {
    position: relative;
    width: 100%;
    height: 4px;
    border-radius: var(--r-full);
    background: var(--border-default);
  }

  .bm-slider__buffered {
    position: absolute;
    inset-block: 0;
    inset-inline-start: 0;
    border-radius: var(--r-full);
    background: var(--accent-softer);
  }

  .bm-slider__fill {
    position: absolute;
    inset-block: 0;
    inset-inline-start: 0;
    border-radius: var(--r-full);
    background: var(--accent);
  }

  .bm-slider__thumb {
    position: absolute;
    top: 50%;
    width: 10px;
    height: 10px;
    border: 2px solid var(--accent);
    border-radius: var(--r-full);
    background: var(--bg-overlay);
    box-shadow: var(--shadow-sm);
    transform: translate(-50%, -50%) scale(0.9);
    opacity: 1;
    transition: transform 140ms ease;
  }

  .bm-slider:hover .bm-slider__thumb,
  .bm-slider:focus-visible .bm-slider__thumb {
    transform: translate(-50%, -50%) scale(1.1);
  }

  .bm-slider--dragging .bm-slider__thumb {
    transform: translate(-50%, -50%) scale(1.25);
  }

  .bm-slider:focus-visible {
    border-radius: var(--r-sm);
    box-shadow: var(--shadow-ring-focus);
  }

  @media (prefers-reduced-motion: reduce) {
    .bm-slider__thumb {
      transition: none;
    }
  }
</style>
