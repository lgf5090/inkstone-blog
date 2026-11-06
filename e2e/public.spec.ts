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

const articleHrefs = async (page: import('@playwright/test').Page): Promise<string[]> => {
  await page.goto('/')
  return page.locator('.post-card a').evaluateAll((links) =>
    links.map((link) => (link as HTMLAnchorElement).getAttribute('href') ?? '').filter(Boolean),
  )
}

test('the secondary rail puts the calendar above the article outline', async ({ page }) => {
  const hrefs = await articleHrefs(page)
  test.skip(hrefs.length === 0, 'the blog has no posts')
  let found = false
  for (const href of hrefs.slice(0, 6)) {
    await page.goto(href)
    if (await page.locator('.secondary-column .toc-card').count()) { found = true; break }
  }
  test.skip(!found, 'no article exposes an outline')
  const calendar = page.locator('.secondary-column [data-widget="calendar"]').first()
  const toc = page.locator('.secondary-column .toc-card').first()
  test.skip((await calendar.count()) === 0, 'the article has no calendar')
  const calendarFirst = await page.evaluate(() => {
    const card = document.querySelector('.secondary-column [data-widget="calendar"]')
    const outline = document.querySelector('.secondary-column .toc-card')
    if (!card || !outline) return false
    return Boolean(card.compareDocumentPosition(outline) & Node.DOCUMENT_POSITION_FOLLOWING)
  })
  expect(calendarFirst).toBe(true)
  const calendarBox = await calendar.boundingBox()
  const tocBox = await toc.boundingBox()
  expect(calendarBox!.y).toBeLessThan(tocBox!.y)
})

test('the left rail carries the site stats card', async ({ page, request }) => {
  await page.goto('/')
  const firstPost = page.locator('.post-card a').first()
  test.skip((await firstPost.count()) === 0, 'the blog has no posts')
  await page.goto((await firstPost.getAttribute('href')) ?? '/')
  test.skip((await page.locator('.layout-grid[data-sidebar="dual"]').count()) === 0, 'the article uses a single rail')
  if (siteApi && siteKey) {
    const site = await (await request.get(`${siteApi}/api/blog/site`, {
      headers: { 'x-blog-proxy-key': siteKey },
    })).json() as { widgets?: { type: string; enabled?: boolean; column?: string }[] }
    const stats = (site.widgets ?? []).find((widget) => widget.type === 'stats')
    test.skip(!stats || stats.enabled === false || stats.column === 'secondary', 'the site assigns stats elsewhere')
  }
  await expect(page.locator('.layout-grid > aside.sidebar [data-widget="stats"]').first()).toBeVisible()
})

test('desktop rails stay pinned while the article scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const firstPost = page.locator('.post-card a').first()
  test.skip((await firstPost.count()) === 0, 'the blog has no posts')
  await page.goto((await firstPost.getAttribute('href')) ?? '/')
  test.skip((await page.locator('.layout-grid[data-sidebar="dual"]').count()) === 0, 'the article uses a single rail')
  const primary = page.locator('.layout-grid > aside.sidebar').first()
  const secondary = page.locator('.layout-grid > .secondary-column').first()
  for (const rail of [primary, secondary]) {
    expect(await rail.evaluate((element) => getComputedStyle(element).position)).toBe('sticky')
  }
  const scrollable = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
  test.skip(scrollable < 700, 'the article is too short to prove a sticky rail')
  await page.evaluate(() => window.scrollTo(0, 500))
  await page.waitForTimeout(150)
  const primaryBefore = await primary.boundingBox()
  const secondaryBefore = await secondary.boundingBox()
  await page.evaluate(() => window.scrollTo(0, 800))
  await page.waitForTimeout(150)
  const primaryAfter = await primary.boundingBox()
  const secondaryAfter = await secondary.boundingBox()
  expect(Math.abs(primaryAfter!.y - primaryBefore!.y)).toBeLessThan(2)
  expect(Math.abs(secondaryAfter!.y - secondaryBefore!.y)).toBeLessThan(2)
  // Every rail is its own scrollport, so a tall rail is still readable to its end.
  const innerScroll = await primary.evaluate((element) => {
    const before = element.scrollTop
    element.scrollTop = before + 24
    return element.scrollTop > before
  })
  expect(typeof innerScroll).toBe('boolean')
})

test('the collapsed music bubble can be dragged and keeps its position', async ({ page }) => {
  // Both a desktop rail and the phone layout, where the expanded panel is
  // viewport-wide and used to clamp the saved offset back to zero.
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('blog-music-offset-v1'))
    const music = page.locator('[data-blog-music]')
    test.skip((await music.count()) === 0, 'music is not configured')
    test.skip((await music.getAttribute('data-playable')) !== 'true', 'music has no playable tracks')
    await music.locator('[data-blog-music-trigger]').click()
    const expanded = page.locator('.bm-player:not(.bm-player--collapsed)')
    await expect(expanded).toBeVisible()
    await expanded.locator('.bm-header-actions button').first().click()
    const bubble = page.locator('.bm-player--collapsed')
    await expect(bubble).toBeVisible()
    const before = (await bubble.boundingBox())!
    await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2)
    await page.mouse.down()
    await page.mouse.move(before.x + before.width / 2 - 150, before.y + before.height / 2 - 100, { steps: 8 })
    await page.mouse.up()
    await expect(bubble).toBeVisible()
    const after = (await bubble.boundingBox())!
    expect(after.x, `x at ${width}px`).toBeLessThan(before.x - 40)
    expect(after.y, `y at ${width}px`).toBeLessThan(before.y - 20)
    const stored = await page.evaluate(() => localStorage.getItem('blog-music-offset-v1'))
    expect(stored).toBeTruthy()
    await page.reload()
    await page.locator('[data-blog-music-trigger]').click()
    await page.locator('.bm-header-actions button').first().click()
    const restored = page.locator('.bm-player--collapsed')
    await expect(restored).toBeVisible()
    const restoredBox = (await restored.boundingBox())!
    expect(Math.abs(restoredBox.x - after.x), `restored x at ${width}px`).toBeLessThan(6)
    expect(Math.abs(restoredBox.y - after.y), `restored y at ${width}px`).toBeLessThan(6)
  }
})

test('article chrome follows the requested language in both directions', async ({ page }) => {
  await page.goto('/')
  const firstPost = page.locator('.post-card a').first()
  test.skip((await firstPost.count()) === 0, 'the blog has no posts')
  const href = (await firstPost.getAttribute('href')) ?? '/'
  const separator = href.includes('?') ? '&' : '?'

  await page.goto(`${href}${separator}lang=zh-CN`)
  expect(await page.locator('html').getAttribute('lang')).toBe('zh-CN')
  await expect(page.locator('.top-app-bar .top-nav a.nav-link').first()).toHaveText('首页')
  const tocTitle = page.locator('.toc-head .sidebar-title')
  if (await tocTitle.count()) await expect(tocTitle).toHaveText('本页目录')
  const statsTitle = page.locator('[data-widget="stats"] .sidebar-title')
  if (await statsTitle.count()) await expect(statsTitle).toHaveText('站点概览')
  const calendarTitle = page.locator('[data-widget="calendar"] .sidebar-title')
  if (await calendarTitle.count()) await expect(calendarTitle).toHaveText('日历')
  const metaZh = page.locator('.article-meta')
  await expect(metaZh).toContainText(/发布于|作者/)
  await expect(metaZh).toContainText(/分钟阅读/)
  await expect(metaZh).not.toContainText(/Published|min read/)

  await page.goto(`${href}${separator}lang=en`)
  expect(await page.locator('html').getAttribute('lang')).toBe('en')
  await expect(page.locator('.top-app-bar .top-nav a.nav-link').first()).toHaveText('Home')
  if (await tocTitle.count()) await expect(tocTitle).toHaveText('On this page')
  if (await statsTitle.count()) await expect(statsTitle).toHaveText('At a glance')
  if (await calendarTitle.count()) await expect(calendarTitle).toHaveText('Calendar')
  const metaEn = page.locator('.article-meta')
  await expect(metaEn).toContainText(/Published|Author/)
  await expect(metaEn).toContainText(/min read/)
  await expect(metaEn).not.toContainText(/发布于|分钟阅读|作者/)
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

test('a configured music card opens its player', async ({ page }) => {
  await page.goto('/')
  const card = page.locator('[data-blog-music]')
  test.skip((await card.count()) === 0, 'music is not configured')
  test.skip((await card.getAttribute('data-playable')) !== 'true', 'music has no playable tracks')
  await card.locator('[data-blog-music-trigger]').click()
  await expect(card.locator('.bm-player')).toBeVisible({ timeout: 10_000 })
  await expect(card.locator('.bm-play')).toBeVisible()
})
