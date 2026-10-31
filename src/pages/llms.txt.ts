import type { APIRoute } from 'astro'
import { loadFeeds } from '../lib/blog-api'
import { postLink, siteOrigin } from '../lib/feed'

export const prerender = false

export const GET: APIRoute = async ({ url }) => {
  const feed = await loadFeeds().catch(() => null)
  if (!feed) return new Response('Unavailable', { status: 503 })
  if (feed.site.llms.enable === false) return new Response('Not found', { status: 404 })
  const excluded = new Set(feed.site.llms.excludeTags)
  const posts = feed.posts.filter((post) => !post.tags.some((tag) => excluded.has(tag)))
  const origin = siteOrigin(url, feed.site.site.url)
  const body = [
    `# ${feed.site.site.title}`,
    '',
    feed.site.site.description,
    '',
    '## Posts',
    ...posts.map((post) => `- [${post.title}](${postLink(origin, post.slug, post.permalink, feed.site.permalink.enable)})${post.description ? ` — ${post.description}` : ''}`),
    '',
    '## Full text',
    `- [All posts as Markdown](${origin}/llms-full.txt)`,
    '',
  ].join('\n')
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=60' } })
}
