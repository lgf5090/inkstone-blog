import type { APIRoute } from 'astro'
import { siteOrigin } from '../lib/feed'

export const prerender = false

export const GET: APIRoute = ({ url }) => {
  const origin = siteOrigin(url, '')
  const body = `User-agent: *\nAllow: /\nDisallow: /_blog/\nDisallow: /search\n\nSitemap: ${origin}/sitemap.xml\n`
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } })
}
