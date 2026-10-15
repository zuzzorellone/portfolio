// Redirect di lingua per la root "/". File statico (non processato da Astro)
// per restare compatibile con la CSP `script-src 'self'`.
// SUPPORTED e FALLBACK devono restare allineati a src/i18n/langs.ts (verificato dai test).
export const SUPPORTED = ['it', 'en'];
export const FALLBACK = 'it';

export function detectLang(preferred) {
  for (const tag of preferred) {
    const base = String(tag).toLowerCase().split('-')[0];
    if (SUPPORTED.includes(base)) return base;
  }
  return FALLBACK;
}

if (typeof window !== 'undefined') {
  const preferred =
    navigator.languages && navigator.languages.length > 0 ? navigator.languages : [navigator.language];
  window.location.replace(`/${detectLang(preferred)}/`);
}
