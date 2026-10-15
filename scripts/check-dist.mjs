// Controlli sull'output di `astro build`. Eseguito da `npm run build`: esce con codice 1 se trova errori.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'node-html-parser';
import {
  checkAnchors,
  checkInternalLinks,
  checkLangParity,
  checkLocalizedPage,
  checkNoEmptyLinkBlocks,
  checkNoInlineScripts,
  checkRootRedirect,
  urlPathOf,
} from './lib/dist-checks.mjs';

const DIST = path.resolve('dist');

const entries = await readdir(DIST, { recursive: true, withFileTypes: true });
const files = entries
  .filter((entry) => entry.isFile())
  .map((entry) => path.relative(DIST, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'));
const fileSet = new Set(files);

const pages = await Promise.all(
  files
    .filter((file) => file.endsWith('.html'))
    .map(async (file) => ({ urlPath: urlPathOf(file), html: await readFile(path.join(DIST, file), 'utf8') })),
);

const htmlByUrlPath = new Map(pages.map((page) => [page.urlPath, page.html]));

const home = pages.find((page) => page.urlPath === '/it/');
if (!home) {
  console.error('check-dist: dist/it/index.html non trovato. Hai eseguito astro build?');
  process.exit(1);
}
const canonical = parse(home.html).querySelector('link[rel="canonical"]')?.getAttribute('href');
if (!canonical) {
  console.error('check-dist: <link rel="canonical"> mancante in /it/');
  process.exit(1);
}
const siteOrigin = new URL(canonical).origin;

const errors = [
  ...checkLangParity(pages.map((page) => page.urlPath)),
  ...checkRootRedirect(pages.find((page) => page.urlPath === '/')),
  ...pages.flatMap((page) => [
    ...checkInternalLinks(page, siteOrigin, (file) => fileSet.has(file)),
    ...checkAnchors(page, siteOrigin, (urlPath) => htmlByUrlPath.get(urlPath)),
    ...checkLocalizedPage(page, siteOrigin),
    ...checkNoEmptyLinkBlocks(page),
    ...checkNoInlineScripts(page),
  ]),
];

if (errors.length > 0) {
  console.error(`check-dist: ${errors.length} problemi\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`check-dist: ${pages.length} pagine verificate, nessun problema (${siteOrigin})`);
