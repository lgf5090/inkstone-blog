export const DEFAULT_BLOG_API_ORIGIN = 'https://inkstone.454470.xyz'

function trimOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

export function blogApiOrigin(): string {
  return trimOrigin(import.meta.env.BLOG_API_ORIGIN || DEFAULT_BLOG_API_ORIGIN)
}

export function blogRuntimeOrigin(): string {
  return trimOrigin(import.meta.env.BLOG_RUNTIME_ORIGIN || blogApiOrigin())
}
