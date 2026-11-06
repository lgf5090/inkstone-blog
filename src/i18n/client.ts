import type { MessageKey } from './index'

/**
 * The subset of a locale dictionary an island actually needs. Astro serialises
 * it as a prop, so the client bundle never carries all ten dictionaries.
 */
export type ClientMessages = Partial<Record<string, string>>

export function translator(messages: ClientMessages) {
  return (key: MessageKey): string => messages[key] ?? key
}
