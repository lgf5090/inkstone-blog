import { expect, test } from '@playwright/test'

test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

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
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    expect(overflow, `home overflows at ${width}px`).toBe(false)
  }
})

test('the skip link focuses the main region', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  await expect(page.locator('.skip-link')).toBeFocused()
  await page.keyboard.press('Enter')
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('main-content')
})

test('every page has exactly one h1', async ({ page }) => {
  await page.goto('/')
  expect(await page.locator('h1').count()).toBe(1)
  const firstPost = page.locator('.post-card a').first()
  test.skip((await firstPost.count()) === 0, 'the blog has no posts')
  await page.goto((await firstPost.getAttribute('href')) ?? '/')
  expect(await page.locator('h1').count()).toBe(1)
})

test('an article exposes a breadcrumb trail', async ({ page }) => {
  await page.goto('/')
  const firstPost = page.locator('.post-card a').first()
  test.skip((await firstPost.count()) === 0, 'the blog has no posts')
  await page.goto((await firstPost.getAttribute('href')) ?? '/')
  const crumb = page.locator('nav.breadcrumb')
  await expect(crumb).toBeVisible()
  await expect(crumb.locator('[aria-current="page"]')).toHaveText(/.+/)
})

const siteApi = process.env.BLOG_E2E_SITE_API?.replace(/\/+$/, '')
const siteKey = process.env.BLOG_E2E_SITE_KEY

test('every enabled sidebar widget renders a card', async ({ page, request }) => {
  test.skip(!siteApi || !siteKey, 'the blog site API is not configured')
  const site = await (await request.get(`${siteApi}/api/blog/site`, {
    headers: { 'x-blog-proxy-key': siteKey! },
  })).json() as { widgets?: { type: string; enabled?: boolean; pages?: string[] }[] }
  const expected = (site.widgets ?? [])
    .filter((widget) => widget.enabled !== false && (!widget.pages?.length || widget.pages.includes('post')))
    .map((widget) => widget.type)
  await page.goto('/')
  const firstPost = page.locator('.post-card a').first()
  test.skip((await firstPost.count()) === 0, 'the blog has no posts')
  await page.goto((await firstPost.getAttribute('href')) ?? '/')
  const rendered = await page.evaluate(() =>
    [...document.querySelectorAll('aside.sidebar [data-widget]')].map((element) => element.getAttribute('data-widget') ?? ''),
  )
  for (const type of expected) expect(rendered, `missing sidebar widget: ${type}`).toContain(type)
})

test('client navigation keeps one reading surface and its outline', async ({ page }) => {
  await page.goto('/')
  const first = page.locator('.post-card a').first()
  test.skip((await first.count()) === 0, 'the blog has no posts')
  await first.click()
  await page.waitForURL(/\/posts\//)
  const stage = page.locator('.blog-runtime-stage')
  if (await stage.count()) await expect(stage).toHaveClass(/is-ready/, { timeout: 45_000 })
  const home = page.locator('a[href="/"]').first()
  await home.click()
  await page.waitForURL(/\/$/)
  await expect(page.locator('.hero-banner')).toBeVisible()
  await page.goBack()
  await page.waitForURL(/\/posts\//)
  await page.waitForTimeout(1200)
  expect(await page.locator('.blog-runtime-stage').count()).toBeLessThanOrEqual(1)
  expect(await page.locator('[data-fab]').count()).toBe(1)
})

test('reading overlays expose hover, table copy and a read-only menu', async ({ page }) => {
  await page.goto('/')
  const first = page.locator('.post-card a').first()
  test.skip((await first.count()) === 0, 'the blog has no posts')
  await first.click()
  await page.waitForURL(/\/posts\//)
  const host = page.locator('[data-preview-content]')
  // A plain article keeps the stored snapshot and never mounts the reading
  // runtime, so there are no overlays to exercise on it.
  await page.waitForTimeout(800)
  test.skip((await host.count()) === 0, 'the reading runtime is not mounted for this article')
  await expect(host).toBeVisible()
  const wiki = host.locator('[data-wikilink]').first()
  if (await wiki.count()) {
    await wiki.hover()
    await expect(page.locator('.blog-hover-card')).toBeVisible()
  }
  const table = host.locator('table').first()
  if (await table.count()) {
    await table.scrollIntoViewIfNeeded()
    await table.hover()
    const copy = page.locator('.blog-table-copy')
    await expect(copy).toBeVisible()
    await copy.click()
    await expect(copy).toHaveText(/Copied|已复制|已複製|コピー|복사|Copiado|Disalin|คัดลอก|Kopyalandı|sao chép/i)
    await table.click({ button: 'right' })
    await expect(page.locator('.blog-context-menu')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('.blog-context-menu')).toHaveCount(0)
  }
})

test('a configured music card plays', async ({ page }) => {
  await page.goto('/')
  const card = page.locator('[data-blog-music]')
  test.skip((await card.count()) === 0, 'music is not configured')
  await expect(card.locator('.blog-music__button--primary')).toBeVisible({ timeout: 30_000 })
  await card.locator('.blog-music__button--primary').click()
  await expect(card.locator('.blog-music__button--primary')).toHaveAttribute('aria-label', /Pause|暂停|一時停止|일시정지|Pausar|Jeda|หยุด|Duraklat|Tạm dừng/i, { timeout: 10_000 })
})
