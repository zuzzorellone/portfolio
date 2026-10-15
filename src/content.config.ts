import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: z.string(),
      stack: z.array(z.string()).min(1),
      cover: image(),
      coverAlt: z.string().min(1),
      order: z.number().int(),
      github: z.url().optional(),
      demo: z.url().optional(),
    }),
});

export const collections = { projects };
