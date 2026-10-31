import { env as workerEnv } from 'cloudflare:workers'

export const DEFAULT_BLOG_API_ORIGIN = 'https://inkstone.454470.xyz'
export const DEFAULT_BLOG_API_TIMEOUT_MS = 8000

const runtime = workerEnv as unknown as Record<string, unknown>

function runtimeString(name: string): string | undefined {
  const value = runtime[name]
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

/**
 * Treat the setting as an origin even when it was pasted with a path (`…/api`, `…/blog-admin`) or a
 * trailing slash: request paths are appended by this app, never by the operator.
 */
function normalizeOrigin(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '')
  try {
    return new URL(trimmed).origin
  } catch {
    return trimmed
  }
}

export function blogApiOrigin(): string {
  return normalizeOrigin(runtimeString('BLOG_API_ORIGIN') ?? import.meta.env.BLOG_API_ORIGIN ?? DEFAULT_BLOG_API_ORIGIN)
}

export function blogRuntimeOrigin(): string {
  return normalizeOrigin(runtimeString('BLOG_RUNTIME_ORIGIN') ?? import.meta.env.BLOG_RUNTIME_ORIGIN ?? blogApiOrigin())
}

export function blogProxyKey(): string {
  return runtimeString('BLOG_PROXY_KEY') ?? import.meta.env.BLOG_PROXY_KEY ?? ''
}

export function blogApiTimeoutMs(): number {
  const raw = runtimeString('BLOG_API_TIMEOUT_MS') ?? import.meta.env.BLOG_API_TIMEOUT_MS
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_BLOG_API_TIMEOUT_MS
}
