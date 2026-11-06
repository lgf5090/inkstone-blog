<script lang="ts">
  import { t, type BlogLocale } from '../../i18n'
  import type { BlogNewsletterSubscribeResult } from '../../lib/blog-types'

  interface Props {
    locale: BlogLocale
  }

  let { locale }: Props = $props()
  let email = $state('')
  let website = $state('')
  let submitting = $state(false)
  let notice = $state('')
  let error = $state('')

  function clear(): void {
    notice = ''
    error = ''
  }

  async function submit(event: SubmitEvent): Promise<void> {
    event.preventDefault()
    if (submitting) return
    clear()
    const value = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      error = t(locale, 'newsletter.invalidEmail')
      return
    }
    submitting = true
    try {
      const response = await fetch('/api/blog/newsletter/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ email: value, website, source: 'footer' }),
      })
      const payload = await response.json().catch(() => null) as
        | BlogNewsletterSubscribeResult
        | { error?: { message?: string } }
        | null
      if (!response.ok) {
        if (response.status === 429) error = t(locale, 'newsletter.rateLimited')
        else if (response.status === 400) error = t(locale, 'newsletter.invalidEmail')
        else error = t(locale, 'newsletter.error')
        return
      }
      const result = payload as BlogNewsletterSubscribeResult | null
      if (!result || result.delivery === 'ignored') {
        error = t(locale, 'newsletter.error')
        return
      }
      email = ''
      if (result.delivery === 'already_confirmed' || result.status === 'confirmed') {
        notice = t(locale, 'newsletter.confirmed')
      } else if (result.delivery === 'unavailable') {
        notice = t(locale, 'newsletter.pendingNoMail')
      } else if (result.delivery === 'failed') {
        notice = t(locale, 'newsletter.pendingMailFailed')
      } else if (result.delivery === 'cooldown') {
        notice = t(locale, 'newsletter.pendingCooldown')
      } else {
        notice = t(locale, 'newsletter.pending')
      }
    } catch {
      error = t(locale, 'newsletter.error')
    } finally {
      submitting = false
    }
  }
</script>

<section class="newsletter-panel" aria-labelledby="newsletter-heading">
  <div class="newsletter-copy">
    <h2 id="newsletter-heading" class="newsletter-title">{t(locale, 'newsletter.title')}</h2>
    <p class="newsletter-description">{t(locale, 'newsletter.description')}</p>
  </div>
  <form class="newsletter-form" onsubmit={submit}>
    <div class="newsletter-field">
      <label class="newsletter-label" for="newsletter-email">{t(locale, 'newsletter.emailLabel')}</label>
      <div class="newsletter-row">
        <input
          id="newsletter-email"
          class="newsletter-input"
          type="email"
          bind:value={email}
          placeholder={t(locale, 'newsletter.emailPlaceholder')}
          autocomplete="email"
          maxlength="254"
          required
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? 'newsletter-error' : 'newsletter-hint'}
        />
        <button type="submit" class="newsletter-submit" disabled={submitting} aria-busy={submitting}>
          {submitting ? t(locale, 'newsletter.submitting') : t(locale, 'newsletter.submit')}
        </button>
      </div>
    </div>
    <div class="newsletter-honeypot" aria-hidden="true">
      <label for="newsletter-website">Website</label>
      <input id="newsletter-website" bind:value={website} tabindex="-1" autocomplete="off" />
    </div>
    <p id="newsletter-hint" class="newsletter-hint">{t(locale, 'newsletter.privacy')}</p>
    {#if error}<p id="newsletter-error" class="newsletter-error" role="alert">{error}</p>{/if}
    {#if notice}<p class="newsletter-notice" role="status">{notice}</p>{/if}
  </form>
</section>
