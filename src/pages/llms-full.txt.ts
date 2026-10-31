import type { APIRoute } from 'astro'
import { loadFeeds, loadPost } from '../lib/blog-api'
import { postLink, siteOrigin } from '../lib/feed'

export const prerender = false

function bodyOf(markdown: string): string {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim()
}

export const GET: APIRoute = async ({ url }) => {
  const feed = await loadFeeds().catch(() => null)
  if (!feed) return new Response('Unavailable', { status: 503 })
  if (feed.site.llms.enable === false) return new Response('Not found', { status: 404 })
  const excluded = new Set(feed.site.llms.excludeTags)
  const listed = feed.posts.filter((post) => !post.tags.some((tag) => excluded.has(tag)))
  const origin = siteOrigin(url, feed.site.site.url)
  const posts: Array<{ title: string; link: string; body: string }> = []
  for (let index = 0; index < listed.length; index += 4) {
    const chunk = await Promise.all(listed.slice(index, index + 4).map(async (summary) => {
      if (summary.encrypted) return null
      const post = await loadPost(summary.slug).catch(() => null)
      if (!post?.content) return null
      return { title: post.title, link: postLink(origin, post.slug, post.permalink, feed.site.permalink.enable), body: bodyOf(post.content) }
    }))
    for (const item of chunk) if (item) posts.push(item)
  }
  const body = [
    `# ${feed.site.site.title}`,
    '',
    feed.site.site.description,
    '',
    ...posts.flatMap((post) => [`## [${post.title}](${post.link})`, '', post.body, '']),
  ].join('\n')
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=60' } })
}
