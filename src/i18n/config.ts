export const LOCALES = ['en', 'zh-CN', 'zh-TW', 'ja', 'ko', 'es', 'id', 'th', 'tr', 'vi'] as const
export type BlogLocale = (typeof LOCALES)[number]

export const LOCALE_LABELS: Record<BlogLocale, string> = {
  en: 'English', 'zh-CN': '简体中文', 'zh-TW': '繁體中文', ja: '日本語', ko: '한국어',
  es: 'Español', id: 'Bahasa Indonesia', th: 'ไทย', tr: 'Türkçe', vi: 'Tiếng Việt',
}

/**
 * The only cookie that may store a language choice. `?lang=` is a one-request override and never
 * touches it; the appearance panel is the single writer.
 */
export const LOCALE_PREF_COOKIE = 'blog-locale-pref'
