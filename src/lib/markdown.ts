import MarkdownIt from 'markdown-it'
import sanitizeHtml from 'sanitize-html'

const md = new MarkdownIt({ html: true, linkify: true, breaks: false })
const FRONT_MATTER = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/

export function renderPageMarkdown(source: string): string {
  const rendered = md.render(source.replace(FRONT_MATTER, ''))
  return sanitizeHtml(rendered, {
    allowedTags: [
      'a', 'abbr', 'b', 'blockquote', 'br', 'code', 'del', 'details', 'div', 'em', 'figcaption', 'figure',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'input', 'kbd', 'li', 'mark', 'ol', 'p', 'pre',
      's', 'section', 'small', 'span', 'strong', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'tfoot',
      'th', 'thead', 'tr', 'u', 'ul',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      code: ['class'],
      pre: ['class'],
      span: ['class'],
      div: ['class'],
      input: ['type', 'checked', 'disabled'],
      '*': ['id'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          ...(attribs.href?.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
        },
      }),
      img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: 'lazy' } }),
    },
  })
}
