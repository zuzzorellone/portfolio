import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n/langs';
import { assertParity, splitId } from './project-helpers';

export async function getProjects(lang: Lang): Promise<CollectionEntry<'projects'>[]> {
  const all = await getCollection('projects');
  assertParity(all.map((entry) => entry.id));
  return all
    .filter((entry) => splitId(entry.id).lang === lang)
    .sort((a, b) => a.data.order - b.data.order);
}
