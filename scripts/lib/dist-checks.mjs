import { parse } from 'node-html-parser';

/** Percorso URL servito per un file di dist (posix, relativo a dist). */
export function urlPathOf(file) {
  if (file === 'index.html') return '/';
  if (file.endsWith('/index.html')) return `/${file.slice(0, -'index.html'.length)}`;
  return `/${file}`;
}

/** File di dist che deve esistere per servire un percorso URL. */
export function fileForUrlPath(urlPath) {
  return urlPath.endsWith('/') ? `${urlPath}index.html`.slice(1) : urlPath.slice(1);
}

/** Percorso interno (decodificato, senza query/hash) oppure null se il link non va verificato. */
export function resolveHref(fromUrlPath, href, siteOrigin) {
  if (!href) return null;
  const value = href.trim();
  if (value === '' || /^(#|mailto:|tel:|data:|javascript:)/i.test(value)) return null;
  let url;
  try {
    url = new URL(value, siteOrigin + fromUrlPath);
  } catch {
    return null;
  }
  if (url.origin !== siteOrigin) return null;
  return decodeURIComponent(url.pathname);
}

const LINK_ATTRS = [
  ['a', 'href'],
  ['link', 'href'],
  ['img', 'src'],
  ['script', 'src'],
  ['meta[property="og:image"]', 'content'],
];

export function checkInternalLinks(page, siteOrigin, fileExists) {
  const root = parse(page.html);
  const errors = [];
  for (const [selector, attr] of LINK_ATTRS) {
    for (const el of root.querySelectorAll(selector)) {
      const target = resolveHref(page.urlPath, el.getAttribute(attr), siteOrigin);
      if (target === null) continue;
      if (!fileExists(fileForUrlPath(target))) {
        errors.push(`${page.urlPath}: link interno rotto ${selector}[${attr}] -> ${target}`);
      }
    }
  }
  return errors;
}

export function checkLangParity(urlPaths) {
  const all = new Set(urlPaths);
  const errors = [];
  for (const p of urlPaths) {
    for (const [from, to] of [['/it/', '/en/'], ['/en/', '/it/']]) {
      if (!p.startsWith(from)) continue;
      const counterpart = to + p.slice(from.length);
      if (!all.has(counterpart)) errors.push(`${p}: manca la pagina corrispondente ${counterpart}`);
    }
  }
  return errors;
}

export function checkLocalizedPage(page, siteOrigin) {
  const match = page.urlPath.match(/^\/(it|en)(\/.*)$/);
  if (!match) return [];
  const [, lang, rest] = match;
  const other = lang === 'it' ? 'en' : 'it';
  const root = parse(page.html);
  const errors = [];

  const htmlLang = root.querySelector('html')?.getAttribute('lang');
  if (htmlLang !== lang) errors.push(`${page.urlPath}: <html lang="${htmlLang}"> invece di "${lang}"`);

  const expected = {
    it: `${siteOrigin}/it${rest}`,
    en: `${siteOrigin}/en${rest}`,
    'x-default': `${siteOrigin}/it${rest}`,
  };
  for (const [hreflang, href] of Object.entries(expected)) {
    const actual = root.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`)?.getAttribute('href');
    if (actual !== href) errors.push(`${page.urlPath}: hreflang ${hreflang} = "${actual}", atteso "${href}"`);
  }

  const switchHref = root.querySelector('a[data-lang-switch]')?.getAttribute('href');
  if (switchHref !== `/${other}${rest}`) {
    errors.push(`${page.urlPath}: lang switch punta a "${switchHref}", atteso "/${other}${rest}"`);
  }

  const description = root.querySelector('meta[name="description"]')?.getAttribute('content');
  if (!description?.trim()) errors.push(`${page.urlPath}: meta description mancante o vuota`);

  return errors;
}

export function checkNoEmptyLinkBlocks(page) {
  const root = parse(page.html);
  return root
    .querySelectorAll('[data-project-links]')
    .filter((el) => el.querySelectorAll('a').length === 0)
    .map(() => `${page.urlPath}: contenitore [data-project-links] senza link`);
}

export function checkNoInlineScripts(page) {
  const root = parse(page.html);
  return root
    .querySelectorAll('script')
    .filter((el) => !el.getAttribute('src') && el.getAttribute('type') !== 'application/ld+json')
    .map(() => `${page.urlPath}: script inline non ammesso dalla CSP (script-src 'self')`);
}

export function checkRootRedirect(page) {
  if (!page) return ['/: pagina root mancante'];
  const errors = [];
  const root = parse(page.html);
  if (!root.querySelector('script[src="/lang-redirect.js"]')) {
    errors.push('/: manca <script src="/lang-redirect.js">');
  }
  if (!/<noscript>[\s\S]*?http-equiv="refresh"[\s\S]*?url=\/it\/[\s\S]*?<\/noscript>/i.test(page.html)) {
    errors.push('/: manca il fallback <noscript> con meta refresh verso /it/');
  }
  return errors;
}

/** Ogni link con #ancora verso una pagina del sito deve puntare a un id esistente in quella pagina. */
export function checkAnchors(page, siteOrigin, htmlForUrlPath) {
  const errors = [];
  for (const el of parse(page.html).querySelectorAll('a[href*="#"]')) {
    const href = el.getAttribute('href');
    const hash = href.slice(href.indexOf('#') + 1);
    if (!hash) continue;
    const target = href.startsWith('#') ? page.urlPath : resolveHref(page.urlPath, href, siteOrigin);
    if (target === null) continue;
    const targetHtml = htmlForUrlPath(target);
    if (targetHtml === undefined) continue; // pagina mancante: lo segnala già checkInternalLinks
    if (!parse(targetHtml).getElementById(decodeURIComponent(hash))) {
      errors.push(`${page.urlPath}: ancora inesistente ${href}`);
    }
  }
  return errors;
}
