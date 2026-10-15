import { isLang, LANGS, type Lang } from '../i18n/langs';

/** Gli id dei casi studio hanno forma "<lang>/<slug>" (es. "it/gestionale-lab"). */
export function splitId(id: string): { lang: Lang; slug: string } {
  const [lang, slug, ...rest] = id.split('/');
  if (rest.length > 0 || !lang || !slug || !isLang(lang)) {
    throw new Error(
      `Id caso studio non valido "${id}": atteso "<lang>/<slug>" con lang in ${LANGS.join(', ')}`,
    );
  }
  return { lang, slug };
}

/** Fallisce il build se un caso studio esiste in una sola lingua. */
export function assertParity(ids: string[]): void {
  const slugsByLang = new Map<Lang, Set<string>>(LANGS.map((lang) => [lang, new Set<string>()]));
  const allSlugs = new Set<string>();
  for (const id of ids) {
    const { lang, slug } = splitId(id);
    slugsByLang.get(lang)!.add(slug);
    allSlugs.add(slug);
  }
  const missing: string[] = [];
  for (const slug of [...allSlugs].sort()) {
    for (const lang of LANGS) {
      if (!slugsByLang.get(lang)!.has(slug)) missing.push(`${lang}/${slug}`);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Casi studio senza traduzione: ${missing.join(', ')}`);
  }
}

export type ProjectLink = { kind: 'github' | 'demo'; url: string };

export function projectLinks(data: { github?: string; demo?: string }): ProjectLink[] {
  const links: ProjectLink[] = [];
  if (data.github) links.push({ kind: 'github', url: data.github });
  if (data.demo) links.push({ kind: 'demo', url: data.demo });
  return links;
}
