import { describe, expect, it as test } from 'vitest';
import {
  checkAnchors,
  checkInternalLinks,
  checkLangParity,
  checkLocalizedPage,
  checkNoEmptyLinkBlocks,
  checkNoInlineScripts,
  checkRootRedirect,
  fileForUrlPath,
  resolveHref,
  urlPathOf,
} from '../scripts/lib/dist-checks.mjs';

const ORIGIN = 'https://boarbyte.it';

function localizedHtml(lang: string, rest: string, extra = '') {
  const other = lang === 'it' ? 'en' : 'it';
  return `<!doctype html><html lang="${lang}"><head>
    <meta name="description" content="desc">
    <link rel="alternate" hreflang="it" href="${ORIGIN}/it${rest}">
    <link rel="alternate" hreflang="en" href="${ORIGIN}/en${rest}">
    <link rel="alternate" hreflang="x-default" href="${ORIGIN}/it${rest}">
  </head><body><a data-lang-switch href="/${other}${rest}">X</a>${extra}</body></html>`;
}

describe('percorsi', () => {
  test('urlPathOf', () => {
    expect(urlPathOf('index.html')).toBe('/');
    expect(urlPathOf('it/index.html')).toBe('/it/');
    expect(urlPathOf('it/progetti/x/index.html')).toBe('/it/progetti/x/');
    expect(urlPathOf('404.html')).toBe('/404.html');
  });

  test('fileForUrlPath', () => {
    expect(fileForUrlPath('/')).toBe('index.html');
    expect(fileForUrlPath('/it/')).toBe('it/index.html');
    expect(fileForUrlPath('/og.png')).toBe('og.png');
  });

  test('resolveHref: interni relativi e assoluti, esterni ignorati', () => {
    expect(resolveHref('/it/', '/en/', ORIGIN)).toBe('/en/');
    expect(resolveHref('/it/', 'progetti/x/', ORIGIN)).toBe('/it/progetti/x/');
    expect(resolveHref('/it/', '/it/#contact', ORIGIN)).toBe('/it/');
    expect(resolveHref('/it/', `${ORIGIN}/en/`, ORIGIN)).toBe('/en/');
    expect(resolveHref('/it/', 'https://github.com/x', ORIGIN)).toBeNull();
    expect(resolveHref('/it/', 'mailto:a@b.it', ORIGIN)).toBeNull();
    expect(resolveHref('/it/', 'tel:+39000', ORIGIN)).toBeNull();
    expect(resolveHref('/it/', '#contact', ORIGIN)).toBeNull();
    expect(resolveHref('/it/', undefined, ORIGIN)).toBeNull();
  });
});

describe('checkInternalLinks', () => {
  const page = {
    urlPath: '/it/',
    html: `<html><head><link rel="stylesheet" href="/_astro/a.css">
      <meta property="og:image" content="${ORIGIN}/og.png"></head>
      <body><a href="/en/">en</a><a href="/it/progetti/manca/">x</a><img src="/_astro/c.webp">
      <a href="/it">senza slash</a><a href="https://github.com/x">gh</a></body></html>`,
  };
  const existing = new Set(['_astro/a.css', 'og.png', 'en/index.html', '_astro/c.webp', 'it/index.html']);

  test('segnala solo i link interni rotti (incluso lo slash mancante)', () => {
    const errors = checkInternalLinks(page, ORIGIN, (f: string) => existing.has(f));
    expect(errors).toHaveLength(2);
    expect(errors.join('\n')).toContain('/it/progetti/manca/');
    expect(errors.join('\n')).toContain('-> /it');
  });
});

describe('checkLangParity', () => {
  test('ogni pagina /it/ ha la sua /en/ e viceversa', () => {
    expect(checkLangParity(['/', '/it/', '/en/', '/it/progetti/a/', '/en/progetti/a/'])).toEqual([]);
    const errors = checkLangParity(['/it/', '/en/', '/it/progetti/a/', '/en/progetti/b/']);
    expect(errors).toHaveLength(2);
  });
});

describe('checkLocalizedPage', () => {
  test('pagina corretta', () => {
    const page = { urlPath: '/en/progetti/a/', html: localizedHtml('en', '/progetti/a/') };
    expect(checkLocalizedPage(page, ORIGIN)).toEqual([]);
  });

  test('ignora pagine non localizzate', () => {
    expect(checkLocalizedPage({ urlPath: '/404.html', html: '<html></html>' }, ORIGIN)).toEqual([]);
  });

  test('switch lingua che porta alla home invece che allo stesso caso studio', () => {
    const html = localizedHtml('it', '/progetti/a/').replace('href="/en/progetti/a/"', 'href="/en/"');
    const errors = checkLocalizedPage({ urlPath: '/it/progetti/a/', html }, ORIGIN);
    expect(errors.join('\n')).toContain('lang switch');
  });

  test('lang, hreflang e description errati', () => {
    const html = localizedHtml('it', '/')
      .replace('<html lang="it">', '<html lang="en">')
      .replace(`hreflang="x-default" href="${ORIGIN}/it/"`, `hreflang="x-default" href="${ORIGIN}/en/"`)
      .replace('content="desc"', 'content=""');
    const errors = checkLocalizedPage({ urlPath: '/it/', html }, ORIGIN);
    expect(errors).toHaveLength(3);
  });
});

describe('checkNoEmptyLinkBlocks', () => {
  test('contenitore link vuoto = errore', () => {
    expect(checkNoEmptyLinkBlocks({ urlPath: '/it/progetti/a/', html: '<div data-project-links></div>' })).toHaveLength(1);
    expect(
      checkNoEmptyLinkBlocks({ urlPath: '/it/progetti/a/', html: '<div data-project-links><a href="https://github.com/x">gh</a></div>' }),
    ).toEqual([]);
    expect(checkNoEmptyLinkBlocks({ urlPath: '/it/progetti/a/', html: '<div></div>' })).toEqual([]);
  });
});

describe('checkNoInlineScripts', () => {
  test('script inline vietati, esterni e JSON-LD ammessi', () => {
    expect(checkNoInlineScripts({ urlPath: '/', html: '<script type="module">console.log(1)</script>' })).toHaveLength(1);
    expect(checkNoInlineScripts({ urlPath: '/', html: '<script type="module" src="/lang-redirect.js"></script>' })).toEqual([]);
    expect(checkNoInlineScripts({ urlPath: '/', html: '<script type="application/ld+json">{}</script>' })).toEqual([]);
  });
});

describe('checkRootRedirect', () => {
  test('root con script e fallback noscript verso /it/', () => {
    const html = `<html><head><script type="module" src="/lang-redirect.js"></script>
      <noscript><meta http-equiv="refresh" content="0; url=/it/"></noscript></head><body></body></html>`;
    expect(checkRootRedirect({ urlPath: '/', html })).toEqual([]);
  });

  test('senza fallback noscript', () => {
    const html = '<html><head><script type="module" src="/lang-redirect.js"></script></head></html>';
    expect(checkRootRedirect({ urlPath: '/', html })).toHaveLength(1);
  });

  test('root mancante', () => {
    expect(checkRootRedirect(undefined)).toHaveLength(1);
  });
});

describe('checkAnchors', () => {
  const pages = new Map([
    ['/it/', '<html><body><section id="work"></section><a href="#work">ok</a><a href="#manca">x</a></body></html>'],
    ['/it/progetti/a/', '<html><body><a href="/it/#work">ok</a><a href="/it/#freelance">x</a><a href="https://github.com/x#readme">ext</a></body></html>'],
  ]);

  test('segnala ancore senza id corrispondente, nella stessa pagina o in un\'altra', () => {
    const errors = [...pages.keys()].flatMap((urlPath) =>
      checkAnchors({ urlPath, html: pages.get(urlPath)! }, ORIGIN, (p: string) => pages.get(p)),
    );
    expect(errors).toHaveLength(2);
    expect(errors.join('\n')).toContain('#manca');
    expect(errors.join('\n')).toContain('/it/#freelance');
  });
});
