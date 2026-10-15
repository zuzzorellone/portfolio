import type { SiteConfig } from '../config';

export type ProfileLink = { kind: 'github' | 'linkedin'; label: string; url: string };

/** Profili da mostrare (hero, contatti, footer): solo quelli impostati in config.ts. */
export function profileLinks(links: SiteConfig['links']): ProfileLink[] {
  const profiles: ProfileLink[] = [];
  if (links.github) profiles.push({ kind: 'github', label: 'GitHub', url: links.github });
  if (links.linkedin) profiles.push({ kind: 'linkedin', label: 'LinkedIn', url: links.linkedin });
  return profiles;
}
