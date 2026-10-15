export const LANGS = ['it', 'en'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'it';

export function isLang(value: string): value is Lang {
  return (LANGS as readonly string[]).includes(value);
}

export function otherLang(lang: Lang): Lang {
  return lang === 'it' ? 'en' : 'it';
}

/** `path` è il percorso senza lingua, con slash iniziale e finale: "/" o "/progetti/x/". */
export function localizePath(lang: Lang, path: string): string {
  if (!path.startsWith('/') || !path.endsWith('/')) {
    throw new Error(`localizePath: il path deve iniziare e finire con "/", ricevuto "${path}"`);
  }
  return `/${lang}${path}`;
}
