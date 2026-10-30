import { expect, test } from '@playwright/test'

const richSlug = process.env.BLOG_E2E_RICH_SLUG ?? ''

test('home lists the blog and its navigation', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.status()).toBe(200)
  await expect(page.locator('.hero-title')).toBeVisible()
  await expect(page.locator('.top-app-bar, header').first()).toBeVisible()
})

test('sitemap and llms endpoints stay valid', async ({ request }) => {
  const sitemap = await request.get('/sitemap.xml')
  expect(sitemap.status()).toBe(200)
  expect(await sitemap.text()).toContain('<urlset')
  const llms = await request.get('/llms.txt')
  expect(llms.status()).toBe(200)
  expect(await llms.text()).toContain('# ')
})

test('an article shows a reading surface and an outline', async ({ page }) => {
  await page.goto('/')
  const firstPost = page.locator('.post-card a').first()
  test.skip((await firstPost.count()) === 0, 'the blog has no posts')
  const href = await firstPost.getAttribute('href')
  await page.goto(href ?? '/')
  await expect(page.locator('[data-blog-reading-host]')).toBeVisible()
  await expect(page.locator('.ink-prose').first()).toBeVisible()
  const toc = page.locator('[data-toc]')
  if (await toc.count()) {
    const filter = toc.locator('[data-toc-filter]')
    await filter.fill('a')
    await filter.fill('')
    await expect(toc.locator('[data-toc-link]').first()).toBeVisible()
  }
})

test('a rich article hydrates and keeps its blocks', async ({ page }) => {
  test.skip(!richSlug, 'BLOG_E2E_RICH_SLUG is not configured')
  await page.goto(`/posts/${encodeURIComponent(richSlug)}`)
  const stage = page.locator('.blog-runtime-stage')
  await expect(stage).toHaveClass(/is-ready/, { timeout: 45_000 })
  await expect(stage.locator('[data-preview-content]')).toBeVisible()
  await expect(stage.locator('.katex, .kanban-block, .mindmap-block, .chart-block-wrap').first()).toBeVisible()
})

test('a narrow viewport does not scroll sideways', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  expect(overflow).toBe(false)
})
