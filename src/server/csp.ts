/**
 * Astro's built-in CSP cannot be used together with ClientRouter, and a nonce does not survive the
 * router's re-execution of inline scripts. Every executable inline script is therefore rendered from
 * Layout and kept static, so a hash policy covers both the first load and later client-side swaps.
 */
export const CSP_REPORT_ONLY = true

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  let raw = ''
  for (const byte of new Uint8Array(digest)) raw += String.fromCharCode(byte)
  return btoa(raw)
}

export async function inlineScriptHashes(html: string): Promise<string[]> {
  const hashes = new Set<string>()
  const scripts = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null
  while ((match = scripts.exec(html))) {
    const attrs = match[1] ?? ''
    if (/\bsrc\s*=/i.test(attrs)) continue
    const type = (/\btype\s*=\s*["']([^"']*)["']/i.exec(attrs)?.[1] ?? '').trim().toLowerCase()
    if (type && type !== 'module' && type !== 'text/javascript' && type !== 'application/javascript') continue
    const body = match[2] ?? ''
    if (!body.trim()) continue
    hashes.add(await sha256(body))
  }
  return [...hashes]
}

export function contentSecurityPolicy(hashes: string[]): string {
  const scriptHashes = hashes.map((hash) => `'sha256-${hash}'`).join(' ')
  return [
    "default-src 'self'",
    [
      "script-src 'self'",
      scriptHashes,
      "'wasm-unsafe-eval'",
      'https://static.cloudflareinsights.com',
      'https://cloud.umami.is',
      'https://giscus.app',
      'https://cdn.jsdelivr.net',
      'https://unpkg.com',
    ].filter(Boolean).join(' '),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "media-src 'self' blob: https:",
    "frame-src 'self' blob: https:",
    "connect-src 'self' https:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join('; ')
}
