import it from './it.json';
import en from './en.json';
import type { Lang } from './langs';

export * from './langs';

export type UiKey = keyof typeof it;

// Se en.json non ha una chiave di it.json, `astro check` fallisce qui.
const dictionaries: Record<Lang, Record<UiKey, string>> = { it, en };

export function t(lang: Lang, key: UiKey): string {
  return dictionaries[lang][key];
}
