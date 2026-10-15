# Portfolio personale — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sito portfolio statico bilingue (IT/EN) per Christian Esposito, orientato a PMI e recruiter, servito da un container nginx dietro il nginx del VPS su `boarbyte.it`.

**Architecture:** Astro 7 in output statico, nessun JavaScript lato client tranne un piccolo redirect di lingua sulla root. Testi dell'interfaccia in dizionari JSON tipizzati; casi studio come content collection Markdown (uno per lingua, stesso slug). Il build esegue un controllo automatico sull'output (`scripts/check-dist.mjs`) che fallisce su link rotti, traduzioni mancanti, hreflang errati e script inline. Immagine Docker multi-stage → `nginx:stable-alpine`.

**Tech Stack:** Astro 7.3, TypeScript strict, `@astrojs/sitemap`, `@fontsource-variable/fraunces` + `@fontsource-variable/inter` (self-hosted), Vitest 5, `node-html-parser`, sharp, Docker + nginx.

**Spec:** `docs/superpowers/specs/2026-10-15-portfolio-design.md`

## Global Constraints

- Node 24 in locale (v24.14) e `node:24-alpine` nel build Docker; Astro richiede Node ≥ 22.12.
- Astro: `output` statico, `trailingSlash: 'always'`, `build.format: 'directory'`, `build.inlineStylesheets: 'never'`.
- **Nessuno script inline** nell'HTML generato (la CSP usa `script-src 'self'`). Astro 7 inserisce inline gli `<script>` dei componenti, quindi **non** usare `<script>` processati nei componenti. L'unico JS è `public/lang-redirect.js`.
- Nessuna richiesta esterna a runtime: font self-hosted, niente analytics, niente CDN. Quindi niente cookie e niente banner.
- Tutti i testi dell'interfaccia vengono da `src/i18n/it.json` / `src/i18n/en.json`. Nei componenti non ci sono stringhe di UI scritte a mano (fanno eccezione nome, email e voci di stack in `src/config.ts`).
- Route: `/it/…` e `/en/…`; caso studio `/[lang]/progetti/[slug]/`; root `/` = redirect di lingua.
- Dominio solo in `SITE.url` (`src/config.ts`) = `https://boarbyte.it`. Nome mostrato "Christian Esposito", brand "Boarbyte" secondario.
- Lighthouse mobile ≥ 95 su Performance, Accessibility, Best Practices, SEO (home e una pagina caso studio).
- Leggibile da 360px di larghezza; contrasto WCAG AA; focus visibile; navigazione da tastiera.
- **Git è gestito dall'utente:** chi esegue il piano non lancia mai `git` (né init, né add, né commit, né push). Gli step "Checkpoint" chiedono solo di avvisare l'utente che c'è materiale pronto da committare.
- Le API usate sono verificate su Astro 7.3.8: `src/content.config.ts`, `glob` da `astro/loaders`, `z` da `astro/zod` (Zod 4: `z.url()`), `render()` da `astro:content`, `Image`/`getImage` da `astro:assets`.

## Review Focus

1. **Caso studio senza GitHub né demo** → nessun pulsante e nessun contenitore vuoto. Test unitario su `projectLinks` (Task 2) e check `checkNoEmptyLinkBlocks` sull'output (Task 3).
2. **Cambio lingua da una pagina caso studio** → porta allo stesso slug nell'altra lingua, non alla home. Check `checkLocalizedPage` sul link `data-lang-switch` (Task 3).
3. **Root `/` con JavaScript disattivato o browser in una lingua non supportata (es. `de-DE`)** → si finisce su `/it/`. Test unitario su `detectLang` (Task 1) e check `checkRootRedirect` sul `<noscript>` (Task 3).
4. **URL senza slash finale o inesistente in produzione** → 301 relativo verso la versione con slash, e 404 personalizzata con status 404. Smoke test `deploy/smoke-test.sh` (Task 7).
5. **Schermo da 360px con parole lunghe** (es. "Containerizzazione", titoli lunghi dei casi studio) → nessuno scroll orizzontale. Gestito con `overflow-wrap` e `hyphens` in `global.css` (Task 4) e verificato a mano a 360px (Task 8).

---

## File Structure

```
package.json, package-lock.json      # script: dev, build (check+build+check-dist), test
astro.config.ts                      # site da SITE.url, sitemap, trailingSlash, format
tsconfig.json, vitest.config.ts
.gitignore, .dockerignore
src/
  config.ts                          # SITE (nome, brand, url, email, P.IVA, link) + STACK
  content.config.ts                  # collection "projects" + schema
  content/projects/{it,en}/<slug>.md # casi studio
  assets/projects/<slug>.png         # cover (placeholder generati, poi screenshot reali)
  i18n/
    langs.ts                         # LANGS, Lang, isLang, otherLang, localizePath (no JSON)
    utils.ts                         # t() + re-export di langs.ts
    it.json, en.json                 # testi UI
  lib/
    project-helpers.ts               # splitId, assertParity, projectLinks (puri, testabili)
    projects.ts                      # getProjects(lang) (usa astro:content)
  styles/global.css                  # token, reset, utility (.container, .btn, .tags…)
  layouts/
    Base.astro                       # <head> SEO/OG/hreflang, header, footer
    CaseStudy.astro
  components/
    Header.astro, LangSwitch.astro, Footer.astro, SectionHeading.astro,
    Hero.astro, Services.astro, CaseStudies.astro, CaseStudyCard.astro,
    Process.astro, Experience.astro, Contact.astro
  pages/
    index.astro                      # redirect lingua (+ noscript → /it/)
    404.astro                        # bilingue
    robots.txt.ts
    [lang]/index.astro
    [lang]/progetti/[slug].astro
public/
  lang-redirect.js                   # unico JS: detectLang + redirect
  favicon.svg, og.png
  cv/cv-it.pdf, cv/cv-en.pdf         # placeholder finché l'utente non fornisce i CV
scripts/
  make-images.mjs                    # genera og.png e cover placeholder
  check-dist.mjs                     # runner dei controlli sull'output
  lib/dist-checks.mjs                # funzioni pure dei controlli
tests/
  i18n.test.ts, lang-redirect.test.ts, project-helpers.test.ts, dist-checks.test.ts
deploy/
  nginx/default.conf, nginx/security-headers.conf
  host-nginx.conf.example
  smoke-test.sh
  README.md
Dockerfile, docker-compose.yml
```

---

### Task 1: Scaffold, configurazione e i18n

**Files:**
- Create: `package.json`, `astro.config.ts`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`
- Create: `src/config.ts`, `src/i18n/langs.ts`, `src/i18n/utils.ts`, `src/i18n/it.json`, `src/i18n/en.json`
- Create: `public/lang-redirect.js`
- Test: `tests/i18n.test.ts`, `tests/lang-redirect.test.ts`

**Interfaces:**
- Produces:
  - `SITE: SiteConfig` e `STACK` da `src/config.ts` (forme sotto).
  - `LANGS: readonly ['it','en']`, `type Lang`, `DEFAULT_LANG: Lang`, `isLang(value: string): value is Lang`, `otherLang(lang: Lang): Lang`, `localizePath(lang: Lang, path: string): string` da `src/i18n/langs.ts`.
  - `t(lang: Lang, key: UiKey): string`, `type UiKey` da `src/i18n/utils.ts`, che riesporta anche tutto `langs.ts`.
  - `detectLang(preferred: readonly string[]): 'it' | 'en'`, `SUPPORTED`, `FALLBACK` da `public/lang-redirect.js`.

- [ ] **Step 1: Crea `package.json` e installa le dipendenze**

```json
{
  "name": "portfolio",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro check && astro build && node scripts/check-dist.mjs",
    "preview": "astro preview",
    "test": "vitest run",
    "images": "node scripts/make-images.mjs"
  }
}
```

Run:
```bash
npm install astro@^7.3.8 @astrojs/sitemap@^3.7.4 @fontsource-variable/fraunces @fontsource-variable/inter sharp
npm install -D @astrojs/check@^0.9.10 typescript vitest@^5.0.4 node-html-parser@^9.0.4
```
Expected: installazione senza errori; `package-lock.json` creato.

Nota: `build` usa `scripts/check-dist.mjs`, che arriva nel Task 3. Fino al Task 4 si usa `npx astro build` direttamente.

- [ ] **Step 2: Crea i file di configurazione**

`tsconfig.json`:
```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "node_modules"],
  "compilerOptions": { "resolveJsonModule": true }
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/**/*.test.ts'] },
});
```

`.gitignore`:
```
node_modules/
dist/
.astro/
.env
*.log
```

`src/config.ts`:
```ts
export interface SiteConfig {
  /** Nome mostrato in header, titoli e footer */
  name: string;
  /** Brand secondario (firma accanto al nome); null per nasconderlo */
  brand: string | null;
  /** URL pubblico, senza slash finale */
  url: string;
  email: string;
  /** Partita IVA, obbligatoria nel footer se presente; null per nasconderla */
  vatId: string | null;
  /** Link opzionali: se null il relativo elemento non viene mostrato */
  links: {
    linkedin: string | null;
    github: string | null;
    booking: string | null;
  };
}

export const SITE: SiteConfig = {
  name: 'Christian Esposito',
  brand: 'Boarbyte',
  url: 'https://boarbyte.it',
  email: 'christian@boarbyte.it',
  vatId: null,
  links: {
    linkedin: null,
    github: null,
    booking: null,
  },
};

export const STACK = {
  backend: ['Java', 'Spring Boot', 'JSF', 'REST API', 'SQL'],
  frontend: ['React', 'TypeScript', 'HTML e CSS'],
  devops: ['Docker', 'nginx', 'Linux', 'DNS e domini', "HTTPS / Let's Encrypt"],
} as const;
```

`astro.config.ts`:
```ts
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITE } from './src/config';

export default defineConfig({
  site: SITE.url,
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'never' },
  integrations: [
    sitemap({
      // La root è solo un redirect di lingua: fuori dalla sitemap
      filter: (page) => page !== `${SITE.url}/`,
      i18n: { defaultLocale: 'it', locales: { it: 'it-IT', en: 'en-US' } },
    }),
  ],
});
```

- [ ] **Step 3: Scrivi i test i18n (falliranno)**

`tests/i18n.test.ts`:
```ts
import { describe, expect, it as test } from 'vitest';
import itDict from '../src/i18n/it.json';
import enDict from '../src/i18n/en.json';
import { LANGS, isLang, localizePath, otherLang, t } from '../src/i18n/utils';

describe('dizionari', () => {
  test('it ed en hanno esattamente le stesse chiavi', () => {
    expect(Object.keys(enDict).sort()).toEqual(Object.keys(itDict).sort());
  });

  test('nessun valore vuoto', () => {
    for (const [lang, dict] of [['it', itDict], ['en', enDict]] as const) {
      for (const [key, value] of Object.entries(dict)) {
        expect(value.trim(), `${lang}:${key}`).not.toBe('');
      }
    }
  });
});

describe('helper lingua', () => {
  test('LANGS contiene it ed en, it per primo', () => {
    expect(LANGS).toEqual(['it', 'en']);
  });

  test('isLang riconosce solo le lingue supportate', () => {
    expect(isLang('it')).toBe(true);
    expect(isLang('en')).toBe(true);
    expect(isLang('de')).toBe(false);
    expect(isLang('')).toBe(false);
  });

  test('otherLang alterna', () => {
    expect(otherLang('it')).toBe('en');
    expect(otherLang('en')).toBe('it');
  });

  test('localizePath antepone la lingua', () => {
    expect(localizePath('it', '/')).toBe('/it/');
    expect(localizePath('en', '/progetti/gestionale-lab/')).toBe('/en/progetti/gestionale-lab/');
  });

  test('localizePath rifiuta path senza slash iniziale o finale', () => {
    expect(() => localizePath('it', 'progetti/')).toThrow();
    expect(() => localizePath('it', '/progetti')).toThrow();
  });

  test('t restituisce il testo nella lingua richiesta', () => {
    expect(t('it', 'nav.contact')).toBe('Contatti');
    expect(t('en', 'nav.contact')).toBe('Contact');
  });
});
```

`tests/lang-redirect.test.ts`:
```ts
import { describe, expect, it as test } from 'vitest';
// @ts-expect-error: file JS statico servito così com'è, senza tipi
import { detectLang, SUPPORTED, FALLBACK } from '../public/lang-redirect.js';
import { LANGS, DEFAULT_LANG } from '../src/i18n/langs';

describe('detectLang', () => {
  test('sceglie la prima lingua supportata in ordine di preferenza', () => {
    expect(detectLang(['en-GB', 'it-IT'])).toBe('en');
    expect(detectLang(['it-IT', 'en-US'])).toBe('it');
  });

  test('ignora maiuscole e regione', () => {
    expect(detectLang(['EN-us'])).toBe('en');
  });

  test('salta le lingue non supportate', () => {
    expect(detectLang(['de-DE', 'en'])).toBe('en');
  });

  test('ricade su it se nessuna lingua è supportata o la lista è vuota', () => {
    expect(detectLang(['de-DE', 'fr'])).toBe('it');
    expect(detectLang([])).toBe('it');
  });

  test('resta allineato a src/i18n/langs.ts', () => {
    expect(SUPPORTED).toEqual([...LANGS]);
    expect(FALLBACK).toBe(DEFAULT_LANG);
  });
});
```

- [ ] **Step 4: Esegui i test e verifica che falliscano**

Run: `npx vitest run`
Expected: FAIL. I moduli `src/i18n/utils`, `src/i18n/langs`, `public/lang-redirect.js` e i JSON non esistono ancora.

- [ ] **Step 5: Implementa `langs.ts`, `utils.ts` e `lang-redirect.js`**

`src/i18n/langs.ts` (nessun import di JSON: resta leggero):
```ts
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
```

`src/i18n/utils.ts`:
```ts
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
```

`public/lang-redirect.js`:
```js
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
```

- [ ] **Step 6: Crea i dizionari completi**

Sono bozze: l'utente le rivedrà (spec §7). Le voci marcate con "(da confermare)" nel Task 8 vanno verificate con l'utente.

`src/i18n/it.json`:
```json
{
  "meta.title": "Christian Esposito — Gestionali e web app su misura",
  "meta.description": "Sviluppatore software con 6 anni di esperienza: gestionali, web app e messa online per piccole e medie imprese. Java, Spring Boot, React, Docker.",
  "meta.ogLocale": "it_IT",
  "a11y.skip": "Vai al contenuto",
  "nav.label": "Navigazione principale",
  "nav.work": "Progetti",
  "nav.experience": "Esperienza",
  "nav.contact": "Contatti",
  "lang.switch": "EN",
  "lang.switchLabel": "Read this page in English",
  "hero.eyebrow": "Sviluppatore software · Backend e web app",
  "hero.title": "Sviluppo gestionali e web app su misura,",
  "hero.titleAccent": "dal codice alla messa online.",
  "hero.lead": "Aiuto piccole e medie imprese a digitalizzare i propri processi con software affidabile, sicuro e semplice da usare. Sei anni di consulenza enterprise, al servizio del tuo progetto.",
  "hero.ctaPrimary": "Parliamo del tuo progetto",
  "hero.ctaCv": "Scarica il CV",
  "services.label": "Servizi",
  "services.title": "Cosa posso fare per la tua azienda",
  "services.1.title": "Gestionali su misura",
  "services.1.body": "Software costruito sui tuoi processi: anagrafiche, ordini, magazzino, prenotazioni. Niente più fogli Excel sparsi, un unico strumento condiviso.",
  "services.2.title": "Web app e portali",
  "services.2.body": "Aree riservate per clienti e collaboratori, portali e applicazioni web veloci, utilizzabili da computer e smartphone.",
  "services.3.title": "Messa online e manutenzione",
  "services.3.body": "Dominio, server, HTTPS, backup e aggiornamenti: mi occupo io della parte tecnica, tu usi il software.",
  "work.label": "Casi studio",
  "work.title": "Progetti selezionati",
  "process.label": "Metodo",
  "process.title": "Come lavoro",
  "process.1.title": "Analisi",
  "process.1.body": "Capiamo insieme il problema, chi userà il software e cosa serve davvero. Ricevi una proposta chiara, con tempi e costi.",
  "process.2.title": "Sviluppo",
  "process.2.body": "Rilasci frequenti che puoi vedere e provare: nessuna sorpresa a fine progetto.",
  "process.3.title": "Rilascio",
  "process.3.body": "Metto online il software sul tuo dominio, con HTTPS e backup configurati.",
  "process.4.title": "Supporto",
  "process.4.body": "Assistenza, correzioni ed evoluzioni anche dopo la consegna.",
  "experience.label": "Esperienza",
  "experience.title": "Percorso e competenze",
  "experience.lead": "Da sei anni sviluppo software backend per un'azienda di consulenza IT, su progetti enterprise in ambito Java. In parallelo progetto e metto in produzione web app complete con React e Spring Boot.",
  "experience.job.period": "2020 — oggi",
  "experience.job.role": "Sviluppatore backend",
  "experience.job.company": "Azienda di consulenza IT",
  "experience.edu.period": "In corso",
  "experience.edu.title": "Laurea",
  "experience.edu.detail": "Tesi: gestionale per un laboratorio di analisi",
  "experience.stack.backend": "Backend",
  "experience.stack.frontend": "Frontend",
  "experience.stack.devops": "DevOps e infrastruttura",
  "experience.cv": "Scarica il CV (PDF)",
  "contact.label": "Contatti",
  "contact.title": "Hai un progetto in mente?",
  "contact.lead": "Raccontami di cosa hai bisogno: la prima chiacchierata è gratuita e senza impegno.",
  "contact.email": "Scrivimi",
  "contact.booking": "Prenota una call",
  "contact.elsewhere": "Mi trovi anche su",
  "caseStudy.back": "Tutti i progetti",
  "caseStudy.stack": "Tecnologie",
  "caseStudy.github": "Codice su GitHub",
  "caseStudy.demo": "Demo live",
  "caseStudy.ctaTitle": "Ti serve qualcosa di simile?",
  "caseStudy.cta": "Parliamo del tuo progetto",
  "footer.vat": "P.IVA",
  "footer.note": "Nessun cookie, nessun tracciamento.",
  "notFound.title": "Pagina non trovata",
  "notFound.body": "La pagina che cerchi non esiste o è stata spostata.",
  "notFound.home": "Torna alla home"
}
```

`src/i18n/en.json`:
```json
{
  "meta.title": "Christian Esposito — Custom business software and web apps",
  "meta.description": "Software developer with 6 years of experience: business software, web apps and deployment for small and medium businesses. Java, Spring Boot, React, Docker.",
  "meta.ogLocale": "en_US",
  "a11y.skip": "Skip to content",
  "nav.label": "Main navigation",
  "nav.work": "Work",
  "nav.experience": "Experience",
  "nav.contact": "Contact",
  "lang.switch": "IT",
  "lang.switchLabel": "Leggi questa pagina in italiano",
  "hero.eyebrow": "Software developer · Backend and web apps",
  "hero.title": "Custom business software and web apps,",
  "hero.titleAccent": "from code to production.",
  "hero.lead": "I help small and medium businesses digitise their processes with reliable, secure and easy-to-use software. Six years of enterprise consulting, put to work on your project.",
  "hero.ctaPrimary": "Let's talk about your project",
  "hero.ctaCv": "Download CV",
  "services.label": "Services",
  "services.title": "What I can do for your business",
  "services.1.title": "Custom management software",
  "services.1.body": "Software built around your processes: customers, orders, inventory, bookings. No more scattered spreadsheets, one shared tool.",
  "services.2.title": "Web apps and portals",
  "services.2.body": "Private areas for customers and staff, portals and fast web applications that work on desktop and mobile.",
  "services.3.title": "Deployment and maintenance",
  "services.3.body": "Domain, server, HTTPS, backups and updates: I take care of the technical side, you use the software.",
  "work.label": "Case studies",
  "work.title": "Selected work",
  "process.label": "Method",
  "process.title": "How I work",
  "process.1.title": "Discovery",
  "process.1.body": "We figure out the problem together, who will use the software and what is really needed. You get a clear proposal with timeline and costs.",
  "process.2.title": "Development",
  "process.2.body": "Frequent releases you can see and try: no surprises at the end.",
  "process.3.title": "Release",
  "process.3.body": "I put the software online on your domain, with HTTPS and backups configured.",
  "process.4.title": "Support",
  "process.4.body": "Assistance, fixes and improvements after delivery too.",
  "experience.label": "Experience",
  "experience.title": "Background and skills",
  "experience.lead": "For six years I have been building backend software at an IT consulting company, on enterprise Java projects. Alongside that, I design and ship complete web apps with React and Spring Boot.",
  "experience.job.period": "2020 — present",
  "experience.job.role": "Backend developer",
  "experience.job.company": "IT consulting company",
  "experience.edu.period": "In progress",
  "experience.edu.title": "Degree",
  "experience.edu.detail": "Thesis: management software for a medical analysis laboratory",
  "experience.stack.backend": "Backend",
  "experience.stack.frontend": "Frontend",
  "experience.stack.devops": "DevOps and infrastructure",
  "experience.cv": "Download CV (PDF)",
  "contact.label": "Contact",
  "contact.title": "Have a project in mind?",
  "contact.lead": "Tell me what you need: the first conversation is free and with no obligation.",
  "contact.email": "Email me",
  "contact.booking": "Book a call",
  "contact.elsewhere": "You can also find me on",
  "caseStudy.back": "All work",
  "caseStudy.stack": "Technologies",
  "caseStudy.github": "Code on GitHub",
  "caseStudy.demo": "Live demo",
  "caseStudy.ctaTitle": "Need something similar?",
  "caseStudy.cta": "Let's talk about your project",
  "footer.vat": "VAT",
  "footer.note": "No cookies, no tracking.",
  "notFound.title": "Page not found",
  "notFound.body": "The page you are looking for does not exist or has been moved.",
  "notFound.home": "Back to home"
}
```

- [ ] **Step 7: Esegui i test e verifica che passino**

Run: `npx vitest run`
Expected: PASS (13 test in 2 file).

- [ ] **Step 8: Verifica i tipi**

Run: `npx astro check`
Expected: `0 errors`. Un avviso su "no pages" o sull'assenza di content collection va bene in questa fase.

- [ ] **Step 9: Checkpoint**

Avvisa l'utente che lo scaffold è pronto per il commit. Messaggio suggerito: `chore: scaffold Astro, config e i18n`. Non eseguire git.

---

### Task 2: Casi studio (content collection)

**Files:**
- Create: `src/content.config.ts`, `src/lib/project-helpers.ts`, `src/lib/projects.ts`
- Create: `scripts/make-images.mjs` → genera `src/assets/projects/gestionale-lab.png`, `src/assets/projects/portfolio.png`, `public/og.png`
- Create: `src/content/projects/it/gestionale-lab.md`, `src/content/projects/en/gestionale-lab.md`, `src/content/projects/it/portfolio.md`, `src/content/projects/en/portfolio.md`
- Test: `tests/project-helpers.test.ts`

**Interfaces:**
- Consumes: `LANGS`, `Lang`, `isLang` da `src/i18n/langs.ts`.
- Produces:
  - `splitId(id: string): { lang: Lang; slug: string }`: lancia un errore se l'id non è `<lang>/<slug>`.
  - `assertParity(ids: string[]): void`: lancia un errore se uno slug manca in una lingua.
  - `type ProjectLink = { kind: 'github' | 'demo'; url: string }` e `projectLinks(data: { github?: string; demo?: string }): ProjectLink[]`.
  - `getProjects(lang: Lang): Promise<CollectionEntry<'projects'>[]>`, ordinati per `order` crescente.
  - Collection `projects` con `data: { title: string; summary: string; stack: string[]; cover: ImageMetadata; coverAlt: string; order: number; github?: string; demo?: string }`.

- [ ] **Step 1: Scrivi i test (falliranno)**

`tests/project-helpers.test.ts`:
```ts
import { describe, expect, it as test } from 'vitest';
import { assertParity, projectLinks, splitId } from '../src/lib/project-helpers';

describe('splitId', () => {
  test('separa lingua e slug', () => {
    expect(splitId('it/gestionale-lab')).toEqual({ lang: 'it', slug: 'gestionale-lab' });
    expect(splitId('en/portfolio')).toEqual({ lang: 'en', slug: 'portfolio' });
  });

  test('rifiuta lingue non supportate o id malformati', () => {
    expect(() => splitId('de/gestionale-lab')).toThrow(/de\/gestionale-lab/);
    expect(() => splitId('gestionale-lab')).toThrow();
    expect(() => splitId('it/')).toThrow();
    expect(() => splitId('it/a/b')).toThrow();
  });
});

describe('assertParity', () => {
  test('accetta casi studio presenti in tutte le lingue', () => {
    expect(() => assertParity(['it/a', 'en/a', 'en/b', 'it/b'])).not.toThrow();
  });

  test('segnala ogni traduzione mancante', () => {
    expect(() => assertParity(['it/a', 'en/a', 'it/b', 'en/c'])).toThrow(/en\/b.*it\/c/);
  });
});

describe('projectLinks', () => {
  test('nessun link se GitHub e demo sono assenti', () => {
    expect(projectLinks({})).toEqual([]);
  });

  test('solo GitHub', () => {
    expect(projectLinks({ github: 'https://github.com/x/y' })).toEqual([
      { kind: 'github', url: 'https://github.com/x/y' },
    ]);
  });

  test('GitHub prima della demo', () => {
    expect(projectLinks({ demo: 'https://demo.example', github: 'https://github.com/x/y' })).toEqual([
      { kind: 'github', url: 'https://github.com/x/y' },
      { kind: 'demo', url: 'https://demo.example' },
    ]);
  });
});
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run: `npx vitest run tests/project-helpers.test.ts`
Expected: FAIL. Il modulo `../src/lib/project-helpers` non esiste.

- [ ] **Step 3: Implementa gli helper**

`src/lib/project-helpers.ts`:
```ts
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
```

- [ ] **Step 4: Esegui i test e verifica che passino**

Run: `npx vitest run`
Expected: PASS (tutti, compresi quelli del Task 1).

- [ ] **Step 5: Crea la collection e `getProjects`**

`src/content.config.ts`:
```ts
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
```

`src/lib/projects.ts`:
```ts
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
```

- [ ] **Step 6: Genera le immagini placeholder**

`scripts/make-images.mjs`:
```js
// Genera immagini placeholder: anteprima social (public/og.png) e cover dei casi studio.
// Le cover vanno poi sostituite con screenshot reali (stesso nome file, oppure aggiornando il frontmatter).
// Uso: npm run images            (non sovrascrive file esistenti)
//      npm run images -- --force (rigenera tutto)
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const force = process.argv.includes('--force');

const BG = '#faf8f5';
const INK = '#1a1a1a';
const MUTED = '#5c5a57';
const ACCENT = '#c2410c';

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function card({ width, height, eyebrow, title, subtitle }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="${BG}"/>
  <rect x="0" y="${height - 16}" width="100%" height="16" fill="${ACCENT}"/>
  <text x="80" y="${height * 0.34}" font-family="Georgia, serif" font-size="28" letter-spacing="4" fill="${MUTED}">${escape(eyebrow.toUpperCase())}</text>
  <text x="80" y="${height * 0.52}" font-family="Georgia, serif" font-size="72" fill="${INK}">${escape(title)}</text>
  <text x="80" y="${height * 0.66}" font-family="Georgia, serif" font-style="italic" font-size="40" fill="${ACCENT}">${escape(subtitle)}</text>
</svg>`;
}

const outputs = [
  {
    file: 'public/og.png',
    svg: card({ width: 1200, height: 630, eyebrow: 'boarbyte.it', title: 'Christian Esposito', subtitle: 'Gestionali e web app su misura' }),
  },
  {
    file: 'src/assets/projects/gestionale-lab.png',
    svg: card({ width: 1600, height: 1000, eyebrow: 'Caso studio', title: 'Gestionale laboratorio', subtitle: 'Screenshot in arrivo' }),
  },
  {
    file: 'src/assets/projects/portfolio.png',
    svg: card({ width: 1600, height: 1000, eyebrow: 'Caso studio', title: 'Questo sito', subtitle: 'Dal codice alla produzione' }),
  },
];

for (const { file, svg } of outputs) {
  if (existsSync(file) && !force) {
    console.log(`skip ${file} (esiste già)`);
    continue;
  }
  mkdirSync(path.dirname(file), { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(file);
  console.log(`creato ${file}`);
}
```

Run: `npm run images`
Expected: `creato public/og.png`, `creato src/assets/projects/gestionale-lab.png`, `creato src/assets/projects/portfolio.png`.

- [ ] **Step 7: Scrivi i casi studio (bozze)**

`src/content/projects/it/gestionale-lab.md`:
```md
---
title: Gestionale per laboratorio di analisi
summary: Applicazione web per gestire accettazione dei pazienti, esami e referti di un laboratorio di analisi cliniche, con accessi differenziati per ruolo.
stack: [Java, Spring Boot, React, PostgreSQL, Docker]
cover: ../../../assets/projects/gestionale-lab.png
coverAlt: Schermata del gestionale con l'elenco delle accettazioni del giorno (dati fittizi)
order: 1
---

<!-- BOZZA: da rivedere con i dettagli reali del progetto di laurea -->

## Il problema

Un laboratorio di analisi gestisce ogni giorno decine di pazienti, richieste di esami e referti. Con strumenti separati (carta, fogli di calcolo, software datati) aumentano i tempi di attesa e il rischio di errori su dati sensibili.

## La soluzione

Un gestionale web unico che accompagna il paziente dall'accettazione al referto:

- accettazione e anagrafica dei pazienti;
- gestione delle richieste e dello stato degli esami;
- inserimento e consultazione dei referti;
- ruoli distinti (accettazione, tecnici, medici, amministrazione) con permessi dedicati.

## Architettura

Backend REST in Java con Spring Boot, frontend React, database relazionale. L'intera applicazione è containerizzata con Docker per avere ambienti identici in sviluppo e in produzione.

## Il risultato

Un unico punto di accesso per tutto il personale, meno passaggi manuali e dati sanitari protetti da controlli di accesso per ruolo.
```

`src/content/projects/en/gestionale-lab.md`:
```md
---
title: Management software for a medical lab
summary: Web application to manage patient check-in, tests and reports for a clinical analysis laboratory, with role-based access.
stack: [Java, Spring Boot, React, PostgreSQL, Docker]
cover: ../../../assets/projects/gestionale-lab.png
coverAlt: Screenshot of the management software showing today's check-ins (sample data)
order: 1
---

<!-- DRAFT: to be reviewed with the real details of the thesis project -->

## The problem

A medical lab handles dozens of patients, test requests and reports every day. With separate tools (paper, spreadsheets, outdated software) waiting times grow and so does the risk of errors on sensitive data.

## The solution

A single web application that follows the patient from check-in to report:

- patient check-in and records;
- test requests and status tracking;
- report entry and lookup;
- separate roles (front desk, technicians, doctors, administration) with dedicated permissions.

## Architecture

REST backend in Java with Spring Boot, React frontend, relational database. The whole application runs in Docker containers, so development and production environments are identical.

## The outcome

One entry point for all staff, fewer manual steps, and health data protected by role-based access control.
```

`src/content/projects/it/portfolio.md`:
```md
---
title: Questo sito, dal codice alla produzione
summary: Il portfolio che stai leggendo: sito statico bilingue, veloce e senza tracciamento, pubblicato su un server gestito da me con Docker e nginx.
stack: [Astro, TypeScript, Docker, nginx, "Let's Encrypt"]
cover: ../../../assets/projects/portfolio.png
coverAlt: Anteprima della home page di questo sito
order: 2
---

## Il problema

Un sito professionale deve caricarsi all'istante, farsi trovare sui motori di ricerca e rispettare la privacy di chi lo visita, senza diventare un costo di manutenzione.

## La soluzione

- Sito statico generato con Astro: nessun database, nessun codice eseguito lato server.
- Italiano e inglese con URL dedicati e indicazioni corrette per i motori di ricerca.
- Font ospitati localmente, nessun cookie e nessuno strumento di tracciamento.
- Controlli automatici a ogni build: link rotti, traduzioni mancanti, metadati SEO.

## Architettura

Il sito è impacchettato in un'immagine Docker leggera basata su nginx. Sul server, un nginx esistente fa da reverse proxy e gestisce i certificati HTTPS con Let's Encrypt. Un aggiornamento si pubblica con un solo comando.

## Il risultato

Pagine leggere e veloci, punteggi Lighthouse alti, e la stessa filiera che uso per mettere online i progetti dei clienti.
```

`src/content/projects/en/portfolio.md`:
```md
---
title: This website, from code to production
summary: The portfolio you are reading: a fast, bilingual, tracking-free static site, running on a server I manage with Docker and nginx.
stack: [Astro, TypeScript, Docker, nginx, "Let's Encrypt"]
cover: ../../../assets/projects/portfolio.png
coverAlt: Preview of this website's home page
order: 2
---

## The problem

A professional website has to load instantly, be easy to find on search engines and respect visitors' privacy, without becoming a maintenance burden.

## The solution

- Static site generated with Astro: no database, no server-side code.
- Italian and English with dedicated URLs and correct hints for search engines.
- Self-hosted fonts, no cookies and no tracking tools.
- Automatic checks on every build: broken links, missing translations, SEO metadata.

## Architecture

The site is packaged in a lightweight nginx-based Docker image. On the server, an existing nginx acts as reverse proxy and handles HTTPS certificates with Let's Encrypt. An update ships with a single command.

## The outcome

Light, fast pages, high Lighthouse scores, and the same pipeline I use to put client projects online.
```

- [ ] **Step 8: Verifica schema e tipi**

Run: `npx astro sync && npx astro check`
Expected: `0 errors`. Se un frontmatter viola lo schema, `astro sync` indica il file e il campo.

- [ ] **Step 9: Checkpoint**

Avvisa l'utente: pronto per il commit (`feat: casi studio come content collection`). Non eseguire git.

---

### Task 3: Controlli automatici sull'output (`check-dist`)

**Files:**
- Create: `scripts/lib/dist-checks.mjs`, `scripts/check-dist.mjs`
- Test: `tests/dist-checks.test.ts`

**Interfaces:**
- Produces (da `scripts/lib/dist-checks.mjs`; `page = { urlPath: string, html: string }`, tutte le funzioni restituiscono `string[]` di errori tranne dove indicato):
  - `urlPathOf(file: string): string`: `'it/index.html'` → `'/it/'`, `'index.html'` → `'/'`, `'404.html'` → `'/404.html'`.
  - `resolveHref(fromUrlPath: string, href: string | undefined, siteOrigin: string): string | null`: percorso interno decodificato oppure `null` (esterno, mailto, tel, solo hash).
  - `fileForUrlPath(urlPath: string): string`: `'/it/'` → `'it/index.html'`, `'/og.png'` → `'og.png'`.
  - `checkInternalLinks(page, siteOrigin, fileExists: (file: string) => boolean)`
  - `checkLangParity(urlPaths: string[])`
  - `checkLocalizedPage(page, siteOrigin)`: `<html lang>`, hreflang it/en/x-default, link `a[data-lang-switch]`, meta description.
  - `checkNoEmptyLinkBlocks(page)`: nessun `[data-project-links]` senza `<a>`.
  - `checkNoInlineScripts(page)`
  - `checkRootRedirect(page | undefined)`
- Convenzioni markup che i Task 4-6 devono rispettare: `a[data-lang-switch]` nel selettore lingua; `[data-project-links]` sul contenitore dei pulsanti GitHub/demo; root con `<script type="module" src="/lang-redirect.js">` e `<noscript>` con meta refresh a `/it/`.

- [ ] **Step 1: Scrivi i test (falliranno)**

`tests/dist-checks.test.ts`:
```ts
import { describe, expect, it as test } from 'vitest';
import {
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
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run: `npx vitest run tests/dist-checks.test.ts`
Expected: FAIL. Il modulo `../scripts/lib/dist-checks.mjs` non esiste.

- [ ] **Step 3: Implementa i controlli**

`scripts/lib/dist-checks.mjs`:
```js
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
```

- [ ] **Step 4: Esegui i test e verifica che passino**

Run: `npx vitest run`
Expected: PASS (tutti).

- [ ] **Step 5: Crea il runner**

`scripts/check-dist.mjs`:
```js
// Controlli sull'output di `astro build`. Eseguito da `npm run build`: esce con codice 1 se trova errori.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'node-html-parser';
import {
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
```

Il runner verrà eseguito per la prima volta nel Task 4, quando esistono le pagine.

- [ ] **Step 6: Checkpoint**

Avvisa l'utente: pronto per il commit (`test: controlli automatici sull'output del build`). Non eseguire git.

---

### Task 4: Stile, layout base, root, 404 e Hero

**Files:**
- Create: `src/styles/global.css`, `src/layouts/Base.astro`
- Create: `src/components/Header.astro`, `src/components/LangSwitch.astro`, `src/components/Footer.astro`, `src/components/SectionHeading.astro`, `src/components/Hero.astro`
- Create: `src/pages/index.astro`, `src/pages/404.astro`, `src/pages/robots.txt.ts`, `src/pages/[lang]/index.astro`
- Create: `public/favicon.svg`, `public/cv/cv-it.pdf`, `public/cv/cv-en.pdf` (placeholder)

**Interfaces:**
- Consumes: `SITE` (Task 1), `t`, `LANGS`, `DEFAULT_LANG`, `localizePath`, `otherLang`, `type Lang` (Task 1); `check-dist` (Task 3).
- Produces:
  - `Base.astro` props: `{ lang: Lang; path: string; title: string; description: string; ogImage?: ImageMetadata }`. `path` è senza lingua, con slash iniziale e finale.
  - `SectionHeading.astro` props: `{ id: string; label: string; title: string }` (`id` va sull'`<h2>`, da usare con `aria-labelledby`).
  - Classi globali: `.container`, `.section`, `.eyebrow`, `.lead`, `.btn`, `.btn-primary`, `.btn-ghost`, `.tags`, `.actions`.
  - Ancore della home: `#services`, `#work`, `#process`, `#experience`, `#contact`.

- [ ] **Step 1: Stili globali**

`src/styles/global.css`:
```css
:root {
  --bg: #faf8f5;
  --surface: #ffffff;
  --text: #1a1a1a;
  --muted: #5c5a57;
  --line: #e6e1da;
  --accent: #c2410c;
  --accent-ink: #ffffff;

  --font-display: 'Fraunces Variable', Georgia, 'Times New Roman', serif;
  --font-body: 'Inter Variable', system-ui, -apple-system, 'Segoe UI', sans-serif;

  --step--1: clamp(0.83rem, 0.8rem + 0.15vw, 0.92rem);
  --step-0: clamp(1rem, 0.96rem + 0.2vw, 1.125rem);
  --step-1: clamp(1.25rem, 1.15rem + 0.5vw, 1.5rem);
  --step-2: clamp(1.6rem, 1.4rem + 1vw, 2.25rem);
  --step-3: clamp(2.1rem, 1.5rem + 2.6vw, 3.75rem);

  --space-xs: 0.5rem;
  --space-s: 1rem;
  --space-m: 1.5rem;
  --space-l: 3rem;
  --space-xl: clamp(4rem, 3rem + 5vw, 7rem);

  --container: 72rem;
  --gutter: clamp(1rem, 0.5rem + 2.5vw, 2.5rem);
  --radius: 6px;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  -webkit-text-size-adjust: 100%;
  scroll-behavior: smooth;
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
  *,
  *::before,
  *::after {
    transition: none !important;
  }
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  font-size: var(--step-0);
  line-height: 1.6;
  overflow-wrap: break-word;
}

h1,
h2,
h3 {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 500;
  line-height: 1.15;
  text-wrap: balance;
  hyphens: auto;
}

p {
  margin: 0;
}

img {
  display: block;
  max-width: 100%;
  height: auto;
}

a {
  color: inherit;
  text-underline-offset: 0.2em;
}

a:hover {
  color: var(--accent);
}

:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.container {
  width: min(100% - 2 * var(--gutter), var(--container));
  margin-inline: auto;
}

.section {
  padding-block: var(--space-xl);
  border-top: 1px solid var(--line);
  scroll-margin-top: var(--space-s);
}

.eyebrow {
  font-size: var(--step--1);
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}

.lead {
  font-size: var(--step-1);
  line-height: 1.5;
  color: var(--muted);
  max-width: 52ch;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-s);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  padding: 0.8em 1.4em;
  border: 1px solid var(--text);
  border-radius: var(--radius);
  font-weight: 600;
  text-decoration: none;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}

.btn-primary {
  background: var(--text);
  color: var(--bg);
}

.btn-primary:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-ink);
}

.btn-ghost:hover {
  border-color: var(--accent);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tags li {
  padding: 0.15em 0.7em;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  font-size: var(--step--1);
  color: var(--muted);
}

.skip-link {
  position: absolute;
  left: -9999px;
}

.skip-link:focus {
  left: var(--gutter);
  top: var(--space-s);
  z-index: 10;
  padding: 0.5em 1em;
  background: var(--text);
  color: var(--bg);
}
```

- [ ] **Step 2: Header, selettore lingua, footer, titolo di sezione**

`src/components/LangSwitch.astro`:
```astro
---
import { type Lang, t, otherLang, localizePath } from '../i18n/utils';

interface Props {
  lang: Lang;
  path: string;
}

const { lang, path } = Astro.props;
const target = otherLang(lang);
---

<a
  class="lang-switch"
  data-lang-switch
  href={localizePath(target, path)}
  hreflang={target}
  lang={target}
  aria-label={t(lang, 'lang.switchLabel')}
>
  {t(lang, 'lang.switch')}
</a>

<style>
  .lang-switch {
    display: inline-block;
    padding: 0.2em 0.6em;
    border: 1px solid var(--line);
    border-radius: 999px;
    font-weight: 600;
    text-decoration: none;
  }
  .lang-switch:hover {
    border-color: var(--accent);
  }
</style>
```

`src/components/Header.astro`:
```astro
---
import { SITE } from '../config';
import { type Lang, t, localizePath } from '../i18n/utils';
import LangSwitch from './LangSwitch.astro';

interface Props {
  lang: Lang;
  path: string;
}

const { lang, path } = Astro.props;
const home = localizePath(lang, '/');
---

<header class="site-header">
  <div class="container bar">
    <a class="identity" href={home}>
      <span class="name">{SITE.name}</span>
      {SITE.brand && <span class="brand">{SITE.brand}</span>}
    </a>
    <nav aria-label={t(lang, 'nav.label')}>
      <ul>
        <li class="optional"><a href={`${home}#work`}>{t(lang, 'nav.work')}</a></li>
        <li class="optional"><a href={`${home}#experience`}>{t(lang, 'nav.experience')}</a></li>
        <li><a href={`${home}#contact`}>{t(lang, 'nav.contact')}</a></li>
        <li><LangSwitch lang={lang} path={path} /></li>
      </ul>
    </nav>
  </div>
</header>

<style>
  .site-header {
    border-bottom: 1px solid var(--line);
  }
  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-s);
    padding-block: var(--space-s);
  }
  .identity {
    display: flex;
    align-items: baseline;
    gap: 0.6em;
    text-decoration: none;
  }
  .name {
    font-family: var(--font-display);
    font-size: var(--step-1);
    font-weight: 600;
  }
  .brand {
    font-size: var(--step--1);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
  }
  ul {
    display: flex;
    align-items: center;
    gap: var(--space-m);
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: var(--step--1);
    font-weight: 500;
  }
  nav a {
    text-decoration: none;
  }
  @media (max-width: 40rem) {
    .optional,
    .brand {
      display: none;
    }
  }
</style>
```

`src/components/Footer.astro`:
```astro
---
import { SITE } from '../config';
import { type Lang, t } from '../i18n/utils';

interface Props {
  lang: Lang;
}

const { lang } = Astro.props;
const year = new Date().getFullYear();
const parts = [
  `© ${year} ${SITE.name}`,
  SITE.brand,
  SITE.vatId && `${t(lang, 'footer.vat')} ${SITE.vatId}`,
].filter(Boolean);
---

<footer class="site-footer">
  <div class="container row">
    <p>{parts.join(' · ')}</p>
    <p>{t(lang, 'footer.note')}</p>
  </div>
</footer>

<style>
  .site-footer {
    padding-block: var(--space-l);
    border-top: 1px solid var(--line);
    font-size: var(--step--1);
    color: var(--muted);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: var(--space-s);
  }
</style>
```

`src/components/SectionHeading.astro`:
```astro
---
interface Props {
  id: string;
  label: string;
  title: string;
}

const { id, label, title } = Astro.props;
---

<div class="section-heading">
  <p class="eyebrow">{label}</p>
  <h2 id={id}>{title}</h2>
</div>

<style>
  .section-heading {
    display: grid;
    gap: var(--space-xs);
    margin-bottom: var(--space-l);
  }
  h2 {
    max-width: 28ch;
    font-size: var(--step-2);
  }
</style>
```

- [ ] **Step 3: Layout base**

`src/layouts/Base.astro`:
```astro
---
import '@fontsource-variable/fraunces';
import '@fontsource-variable/inter';
import '../styles/global.css';
import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';
import { SITE } from '../config';
import { type Lang, LANGS, DEFAULT_LANG, t, localizePath } from '../i18n/utils';

interface Props {
  lang: Lang;
  /** Percorso senza lingua, con slash iniziale e finale: "/" o "/progetti/x/" */
  path: string;
  title: string;
  description: string;
  ogImage?: ImageMetadata;
}

const { lang, path, title, description, ogImage } = Astro.props;
const absolute = (p: string) => new URL(p, SITE.url).href;
const canonical = absolute(localizePath(lang, path));
const ogSrc = ogImage ? (await getImage({ src: ogImage, width: 1200, format: 'jpg' })).src : '/og.png';
---

<!doctype html>
<html lang={lang}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    {LANGS.map((l) => <link rel="alternate" hreflang={l} href={absolute(localizePath(l, path))} />)}
    <link rel="alternate" hreflang="x-default" href={absolute(localizePath(DEFAULT_LANG, path))} />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content={SITE.name} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={canonical} />
    <meta property="og:image" content={absolute(ogSrc)} />
    <meta property="og:locale" content={t(lang, 'meta.ogLocale')} />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <meta name="theme-color" content="#faf8f5" />
  </head>
  <body>
    <a class="skip-link" href="#main">{t(lang, 'a11y.skip')}</a>
    <Header lang={lang} path={path} />
    <main id="main">
      <slot />
    </main>
    <Footer lang={lang} />
  </body>
</html>
```

- [ ] **Step 4: Hero e pagina home (solo Hero per ora)**

`src/components/Hero.astro`:
```astro
---
import { type Lang, t } from '../i18n/utils';

interface Props {
  lang: Lang;
}

const { lang } = Astro.props;
---

<section class="hero">
  <div class="container">
    <p class="eyebrow">{t(lang, 'hero.eyebrow')}</p>
    <h1>{t(lang, 'hero.title')} <em>{t(lang, 'hero.titleAccent')}</em></h1>
    <p class="lead">{t(lang, 'hero.lead')}</p>
    <div class="actions">
      <a class="btn btn-primary" href="#contact">{t(lang, 'hero.ctaPrimary')}</a>
      <a class="btn btn-ghost" href={`/cv/cv-${lang}.pdf`} download>{t(lang, 'hero.ctaCv')}</a>
    </div>
  </div>
</section>

<style>
  .hero {
    padding-block: var(--space-xl);
  }
  h1 {
    max-width: 20ch;
    margin-block: var(--space-s) var(--space-m);
    font-size: var(--step-3);
  }
  h1 em {
    color: var(--accent);
    font-style: italic;
  }
  .actions {
    margin-top: var(--space-l);
  }
</style>
```

`src/pages/[lang]/index.astro`:
```astro
---
import Base from '../../layouts/Base.astro';
import Hero from '../../components/Hero.astro';
import { LANGS, type Lang, t } from '../../i18n/utils';

export function getStaticPaths() {
  return LANGS.map((lang) => ({ params: { lang } }));
}

const lang = Astro.params.lang as Lang;
---

<Base lang={lang} path="/" title={t(lang, 'meta.title')} description={t(lang, 'meta.description')}>
  <Hero lang={lang} />
</Base>
```

Nota: il link "Parliamo del tuo progetto" punta a `#contact`, che esiste solo dal Task 6. Il link checker ignora le ancore, quindi il build passa lo stesso.

- [ ] **Step 5: Root, 404, robots, favicon, CV placeholder**

`src/pages/index.astro`:
```astro
---
import { SITE } from '../config';
---

<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{SITE.name}</title>
    <meta name="robots" content="noindex" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <script is:inline type="module" src="/lang-redirect.js"></script>
    <noscript><meta http-equiv="refresh" content="0; url=/it/" /></noscript>
  </head>
  <body>
    <p><a href="/it/">Italiano</a> · <a href="/en/">English</a></p>
  </body>
</html>
```

`src/pages/404.astro`:
```astro
---
import '@fontsource-variable/fraunces';
import '@fontsource-variable/inter';
import '../styles/global.css';
import { SITE } from '../config';
import { LANGS, t, localizePath } from '../i18n/utils';
---

<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>404 — {SITE.name}</title>
    <meta name="robots" content="noindex" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  </head>
  <body>
    <main class="container not-found">
      {
        LANGS.map((lang) => (
          <section lang={lang}>
            <p class="eyebrow">404</p>
            <h1>{t(lang, 'notFound.title')}</h1>
            <p class="lead">{t(lang, 'notFound.body')}</p>
            <a class="btn btn-primary" href={localizePath(lang, '/')}>
              {t(lang, 'notFound.home')}
            </a>
          </section>
        ))
      }
    </main>
  </body>
</html>

<style>
  .not-found {
    display: grid;
    gap: var(--space-xl);
    padding-block: var(--space-xl);
  }
  section {
    display: grid;
    gap: var(--space-s);
    justify-items: start;
  }
  h1 {
    font-size: var(--step-3);
  }
</style>
```

`src/pages/robots.txt.ts`:
```ts
import type { APIRoute } from 'astro';
import { SITE } from '../config';

export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap-index.xml', SITE.url).href}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
```

`public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#1a1a1a"/>
  <text x="32" y="42" text-anchor="middle" font-family="Georgia, serif" font-size="30" fill="#faf8f5">CE</text>
</svg>
```

CV placeholder (PDF minimale di una pagina, da sostituire con i CV reali prima del deploy):
```bash
mkdir -p public/cv
for lang in it en; do
  printf '%s\n' '%PDF-1.4' \
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj' \
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj' \
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj' \
    '4 0 obj<</Length 45>>stream' \
    'BT /F1 24 Tf 72 760 Td (CV placeholder) Tj ET' \
    'endstream endobj' \
    '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj' \
    'trailer<</Root 1 0 R>>' \
    '%%EOF' > "public/cv/cv-$lang.pdf"
done
```

- [ ] **Step 6: Build completo con controlli**

Run: `npm run build`
Expected: `astro check` con 0 errori, build completato, poi `check-dist: 4 pagine verificate, nessun problema (https://boarbyte.it)`. Le pagine sono `/`, `/it/`, `/en/` e `/404.html`; i casi studio arrivano nel Task 5.

Se check-dist segnala uno script inline, un componente sta usando `<script>` processato: va rimosso (vedi Global Constraints).

- [ ] **Step 7: Verifica visiva rapida**

Run: `npx astro dev`
Apri `http://localhost:4321/it/` e `http://localhost:4321/en/` (da Windows, WSL2 inoltra `localhost`). Verifica che:
- il font serif sia nel titolo e il sans nel corpo;
- "dal codice alla messa online." sia in corsivo e nel colore d'accento;
- il pulsante EN/IT porti all'altra lingua;
- a larghezza 360px (DevTools → responsive) non ci sia scroll orizzontale e i link "Progetti"/"Esperienza" e il brand siano nascosti.

Ferma il server.

- [ ] **Step 8: Checkpoint**

Avvisa l'utente: pronto per il commit (`feat: layout base, hero, root e 404`). Non eseguire git.

---

### Task 5: Pagina caso studio e sezione Progetti

**Files:**
- Create: `src/layouts/CaseStudy.astro`, `src/pages/[lang]/progetti/[slug].astro`
- Create: `src/components/CaseStudyCard.astro`, `src/components/CaseStudies.astro`
- Modify: `src/pages/[lang]/index.astro` (aggiunge `CaseStudies`)

**Interfaces:**
- Consumes: `Base.astro` props (Task 4); `getProjects`, `splitId`, `assertParity`, `projectLinks` (Task 2); `SectionHeading` (Task 4); markup `data-project-links` (Task 3).
- Produces: route `/[lang]/progetti/[slug]/`; sezione home con `id="work"`.

- [ ] **Step 1: Layout del caso studio**

`src/layouts/CaseStudy.astro`:
```astro
---
import type { CollectionEntry } from 'astro:content';
import { Image } from 'astro:assets';
import Base from './Base.astro';
import { SITE } from '../config';
import { type Lang, t, localizePath } from '../i18n/utils';
import { projectLinks } from '../lib/project-helpers';

interface Props {
  lang: Lang;
  slug: string;
  data: CollectionEntry<'projects'>['data'];
}

const { lang, slug, data } = Astro.props;
const home = localizePath(lang, '/');
const links = projectLinks(data);
const linkLabels = { github: t(lang, 'caseStudy.github'), demo: t(lang, 'caseStudy.demo') };
---

<Base
  lang={lang}
  path={`/progetti/${slug}/`}
  title={`${data.title} — ${SITE.name}`}
  description={data.summary}
  ogImage={data.cover}
>
  <article class="container case">
    <a class="back" href={`${home}#work`}>← {t(lang, 'caseStudy.back')}</a>
    <header>
      <p class="eyebrow">{t(lang, 'work.label')}</p>
      <h1>{data.title}</h1>
      <p class="lead">{data.summary}</p>
      <ul class="tags" aria-label={t(lang, 'caseStudy.stack')}>
        {data.stack.map((item) => <li>{item}</li>)}
      </ul>
      {
        links.length > 0 && (
          <div class="links" data-project-links>
            {links.map((link) => (
              <a class="btn btn-ghost" href={link.url} rel="noopener" data-link={link.kind}>
                {linkLabels[link.kind]} ↗
              </a>
            ))}
          </div>
        )
      }
    </header>
    <Image
      class="cover"
      src={data.cover}
      alt={data.coverAlt}
      widths={[720, 1440]}
      sizes="(min-width: 72rem) 72rem, 100vw"
      loading="eager"
    />
    <div class="prose">
      <slot />
    </div>
    <aside class="cta">
      <h2>{t(lang, 'caseStudy.ctaTitle')}</h2>
      <a class="btn btn-primary" href={`${home}#contact`}>{t(lang, 'caseStudy.cta')}</a>
    </aside>
  </article>
</Base>

<style>
  .case {
    padding-block: var(--space-l) var(--space-xl);
  }
  .back {
    font-size: var(--step--1);
    color: var(--muted);
    text-decoration: none;
  }
  header {
    display: grid;
    gap: var(--space-s);
    max-width: 48rem;
    margin-block: var(--space-l);
  }
  h1 {
    font-size: var(--step-3);
  }
  .links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-s);
    margin-top: var(--space-xs);
  }
  .case :global(.cover) {
    width: 100%;
    margin-bottom: var(--space-l);
    border: 1px solid var(--line);
    border-radius: var(--radius);
  }
  .prose {
    max-width: 42rem;
  }
  .prose :global(h2) {
    margin: var(--space-l) 0 var(--space-s);
    font-size: var(--step-2);
  }
  .prose :global(p),
  .prose :global(ul),
  .prose :global(ol) {
    margin: 0 0 var(--space-s);
  }
  .prose :global(li) {
    margin-bottom: 0.3em;
  }
  .prose :global(img) {
    margin-block: var(--space-m);
    border: 1px solid var(--line);
    border-radius: var(--radius);
  }
  .prose :global(code) {
    padding: 0.1em 0.35em;
    border: 1px solid var(--line);
    border-radius: 4px;
    background: var(--surface);
    font-size: 0.9em;
  }
  .prose :global(pre) {
    overflow-x: auto;
    padding: var(--space-s);
    border-radius: var(--radius);
  }
  .cta {
    display: grid;
    justify-items: start;
    gap: var(--space-m);
    margin-top: var(--space-xl);
    padding-top: var(--space-l);
    border-top: 1px solid var(--line);
  }
  .cta h2 {
    font-size: var(--step-2);
  }
</style>
```

- [ ] **Step 2: Route del caso studio**

`src/pages/[lang]/progetti/[slug].astro`:
```astro
---
import { getCollection, render } from 'astro:content';
import CaseStudy from '../../../layouts/CaseStudy.astro';
import { assertParity, splitId } from '../../../lib/project-helpers';

export async function getStaticPaths() {
  const entries = await getCollection('projects');
  assertParity(entries.map((entry) => entry.id));
  return entries.map((entry) => {
    const { lang, slug } = splitId(entry.id);
    return { params: { lang, slug }, props: { entry } };
  });
}

const { entry } = Astro.props;
const { lang, slug } = splitId(entry.id);
const { Content } = await render(entry);
---

<CaseStudy lang={lang} slug={slug} data={entry.data}>
  <Content />
</CaseStudy>
```

- [ ] **Step 3: Card e sezione Progetti**

`src/components/CaseStudyCard.astro`:
```astro
---
import type { CollectionEntry } from 'astro:content';
import { Image } from 'astro:assets';
import { type Lang, t, localizePath } from '../i18n/utils';
import { splitId } from '../lib/project-helpers';

interface Props {
  lang: Lang;
  project: CollectionEntry<'projects'>;
}

const { lang, project } = Astro.props;
const { slug } = splitId(project.id);
const href = localizePath(lang, `/progetti/${slug}/`);
const { title, summary, stack, cover } = project.data;
---

<article class="card">
  <a class="cover-link" href={href} tabindex="-1" aria-hidden="true">
    <Image src={cover} alt="" widths={[480, 960]} sizes="(min-width: 48rem) 34rem, 100vw" />
  </a>
  <h3><a href={href}>{title}</a></h3>
  <p>{summary}</p>
  <ul class="tags" aria-label={t(lang, 'caseStudy.stack')}>
    {stack.map((item) => <li>{item}</li>)}
  </ul>
</article>

<style>
  .card {
    display: grid;
    gap: var(--space-s);
    align-content: start;
  }
  .cover-link {
    display: block;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
  }
  .cover-link :global(img) {
    width: 100%;
    aspect-ratio: 16 / 10;
    object-fit: cover;
    transition: transform 0.4s ease;
  }
  .card:hover .cover-link :global(img) {
    transform: scale(1.02);
  }
  h3 {
    font-size: var(--step-1);
  }
  h3 a {
    text-decoration: none;
  }
  p {
    color: var(--muted);
  }
</style>
```

`src/components/CaseStudies.astro`:
```astro
---
import SectionHeading from './SectionHeading.astro';
import CaseStudyCard from './CaseStudyCard.astro';
import { getProjects } from '../lib/projects';
import { type Lang, t } from '../i18n/utils';

interface Props {
  lang: Lang;
}

const { lang } = Astro.props;
const projects = await getProjects(lang);
---

<section class="section" id="work" aria-labelledby="work-title">
  <div class="container">
    <SectionHeading id="work-title" label={t(lang, 'work.label')} title={t(lang, 'work.title')} />
    <ul class="grid">
      {
        projects.map((project) => (
          <li>
            <CaseStudyCard lang={lang} project={project} />
          </li>
        ))
      }
    </ul>
  </div>
</section>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
    gap: var(--space-l);
    margin: 0;
    padding: 0;
    list-style: none;
  }
</style>
```

- [ ] **Step 4: Aggiungi la sezione alla home**

In `src/pages/[lang]/index.astro`, aggiungi l'import e il componente dopo `<Hero />`:
```astro
---
import Base from '../../layouts/Base.astro';
import Hero from '../../components/Hero.astro';
import CaseStudies from '../../components/CaseStudies.astro';
import { LANGS, type Lang, t } from '../../i18n/utils';

export function getStaticPaths() {
  return LANGS.map((lang) => ({ params: { lang } }));
}

const lang = Astro.params.lang as Lang;
---

<Base lang={lang} path="/" title={t(lang, 'meta.title')} description={t(lang, 'meta.description')}>
  <Hero lang={lang} />
  <CaseStudies lang={lang} />
</Base>
```

- [ ] **Step 5: Build e controlli**

Run: `npm run build`
Expected: 0 errori; `check-dist: … nessun problema`. Le pagine generate includono `/it/progetti/gestionale-lab/`, `/en/progetti/gestionale-lab/`, `/it/progetti/portfolio/` e `/en/progetti/portfolio/`.

- [ ] **Step 6: Verifica che i controlli scattino davvero**

1. Rinomina temporaneamente `src/content/projects/en/portfolio.md` in `portfolio.md.bak`. Esegui `npm run build`. Expected: FAIL con `Casi studio senza traduzione: en/portfolio`. Ripristina il nome.
2. Aggiungi temporaneamente `github: https://github.com/example/example` al frontmatter di `src/content/projects/it/portfolio.md`. Esegui `npm run build`, poi `grep -c 'data-project-links' dist/it/progetti/portfolio/index.html`. Expected: `1`. Esegui anche `grep -c 'data-project-links' dist/it/progetti/gestionale-lab/index.html`. Expected: `0`. Rimuovi la riga aggiunta.

- [ ] **Step 7: Checkpoint**

Avvisa l'utente: pronto per il commit (`feat: pagine caso studio e sezione progetti`). Non eseguire git.

---

### Task 6: Sezioni Servizi, Come lavoro, Esperienza, Contatti

**Files:**
- Create: `src/components/Services.astro`, `src/components/Process.astro`, `src/components/Experience.astro`, `src/components/Contact.astro`
- Modify: `src/pages/[lang]/index.astro` (ordine finale delle sezioni)

**Interfaces:**
- Consumes: `SectionHeading`, classi globali (Task 4); `SITE`, `STACK` (Task 1); `t` (Task 1).
- Produces: sezioni con id `services`, `process`, `experience`, `contact`.

- [ ] **Step 1: Servizi**

`src/components/Services.astro`:
```astro
---
import SectionHeading from './SectionHeading.astro';
import { type Lang, t } from '../i18n/utils';

interface Props {
  lang: Lang;
}

const { lang } = Astro.props;
const items = ([1, 2, 3] as const).map((n) => ({
  number: String(n).padStart(2, '0'),
  title: t(lang, `services.${n}.title` as const),
  body: t(lang, `services.${n}.body` as const),
}));
---

<section class="section" id="services" aria-labelledby="services-title">
  <div class="container">
    <SectionHeading id="services-title" label={t(lang, 'services.label')} title={t(lang, 'services.title')} />
    <ol class="grid">
      {
        items.map((item) => (
          <li>
            <span class="number" aria-hidden="true">{item.number}</span>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </li>
        ))
      }
    </ol>
  </div>
</section>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
    gap: var(--space-l) var(--space-m);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: grid;
    align-content: start;
    gap: var(--space-xs);
    padding-top: var(--space-s);
    border-top: 2px solid var(--text);
  }
  .number {
    font-family: var(--font-display);
    font-size: var(--step-1);
    color: var(--accent);
  }
  h3 {
    font-size: var(--step-1);
  }
  p {
    color: var(--muted);
  }
</style>
```

- [ ] **Step 2: Come lavoro**

`src/components/Process.astro`:
```astro
---
import SectionHeading from './SectionHeading.astro';
import { type Lang, t } from '../i18n/utils';

interface Props {
  lang: Lang;
}

const { lang } = Astro.props;
const steps = ([1, 2, 3, 4] as const).map((n) => ({
  number: String(n),
  title: t(lang, `process.${n}.title` as const),
  body: t(lang, `process.${n}.body` as const),
}));
---

<section class="section" id="process" aria-labelledby="process-title">
  <div class="container">
    <SectionHeading id="process-title" label={t(lang, 'process.label')} title={t(lang, 'process.title')} />
    <ol class="steps">
      {
        steps.map((step) => (
          <li>
            <span class="number" aria-hidden="true">{step.number}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </li>
        ))
      }
    </ol>
  </div>
</section>

<style>
  .steps {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
    gap: var(--space-l) var(--space-m);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: grid;
    align-content: start;
    gap: var(--space-xs);
  }
  .number {
    display: grid;
    place-items: center;
    width: 2.2rem;
    height: 2.2rem;
    border: 1px solid var(--accent);
    border-radius: 50%;
    font-family: var(--font-display);
    color: var(--accent);
  }
  h3 {
    font-size: var(--step-1);
  }
  p {
    color: var(--muted);
  }
</style>
```

- [ ] **Step 3: Esperienza**

`src/components/Experience.astro`:
```astro
---
import SectionHeading from './SectionHeading.astro';
import { STACK } from '../config';
import { type Lang, t } from '../i18n/utils';

interface Props {
  lang: Lang;
}

const { lang } = Astro.props;
const groups = [
  { title: t(lang, 'experience.stack.backend'), items: STACK.backend },
  { title: t(lang, 'experience.stack.frontend'), items: STACK.frontend },
  { title: t(lang, 'experience.stack.devops'), items: STACK.devops },
];
const entries = [
  {
    period: t(lang, 'experience.job.period'),
    title: t(lang, 'experience.job.role'),
    detail: t(lang, 'experience.job.company'),
  },
  {
    period: t(lang, 'experience.edu.period'),
    title: t(lang, 'experience.edu.title'),
    detail: t(lang, 'experience.edu.detail'),
  },
];
---

<section class="section" id="experience" aria-labelledby="experience-title">
  <div class="container">
    <SectionHeading id="experience-title" label={t(lang, 'experience.label')} title={t(lang, 'experience.title')} />
    <div class="layout">
      <div>
        <p class="lead">{t(lang, 'experience.lead')}</p>
        <dl class="entries">
          {
            entries.map((entry) => (
              <div>
                <dt>{entry.period}</dt>
                <dd>
                  <strong>{entry.title}</strong>
                  <span>{entry.detail}</span>
                </dd>
              </div>
            ))
          }
        </dl>
        <a class="btn btn-ghost" href={`/cv/cv-${lang}.pdf`} download>{t(lang, 'experience.cv')}</a>
      </div>
      <div class="stack">
        {
          groups.map((group) => (
            <div>
              <h3>{group.title}</h3>
              <ul class="tags">
                {group.items.map((item) => (
                  <li>{item}</li>
                ))}
              </ul>
            </div>
          ))
        }
      </div>
    </div>
  </div>
</section>

<style>
  .layout {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 24rem), 1fr));
    gap: var(--space-l);
  }
  .entries {
    display: grid;
    gap: var(--space-s);
    margin: var(--space-m) 0;
  }
  .entries div {
    display: grid;
    grid-template-columns: 8rem 1fr;
    gap: var(--space-s);
    padding-top: var(--space-s);
    border-top: 1px solid var(--line);
  }
  @media (max-width: 30rem) {
    .entries div {
      grid-template-columns: 1fr;
      gap: 0.25rem;
    }
  }
  dt {
    font-size: var(--step--1);
    color: var(--muted);
  }
  dd {
    display: grid;
    margin: 0;
  }
  dd span {
    color: var(--muted);
  }
  .stack {
    display: grid;
    align-content: start;
    gap: var(--space-m);
  }
  .stack h3 {
    margin-bottom: var(--space-xs);
    font-family: var(--font-body);
    font-size: var(--step--1);
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
  }
</style>
```

- [ ] **Step 4: Contatti**

`src/components/Contact.astro`:
```astro
---
import SectionHeading from './SectionHeading.astro';
import { SITE } from '../config';
import { type Lang, t } from '../i18n/utils';

interface Props {
  lang: Lang;
}

const { lang } = Astro.props;
const profiles = [
  { label: 'LinkedIn', url: SITE.links.linkedin },
  { label: 'GitHub', url: SITE.links.github },
].filter((profile): profile is { label: string; url: string } => profile.url !== null);
---

<section class="section" id="contact" aria-labelledby="contact-title">
  <div class="container">
    <SectionHeading id="contact-title" label={t(lang, 'contact.label')} title={t(lang, 'contact.title')} />
    <p class="lead">{t(lang, 'contact.lead')}</p>
    <div class="actions">
      <a class="btn btn-primary" href={`mailto:${SITE.email}`}>{t(lang, 'contact.email')}</a>
      {
        SITE.links.booking && (
          <a class="btn btn-ghost" href={SITE.links.booking} rel="noopener">
            {t(lang, 'contact.booking')}
          </a>
        )
      }
    </div>
    <p class="email"><a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
    {
      profiles.length > 0 && (
        <p class="profiles">
          {t(lang, 'contact.elsewhere')}{' '}
          {profiles.map((profile, i) => (
            <>
              {i > 0 && ' · '}
              <a href={profile.url} rel="me noopener">
                {profile.label}
              </a>
            </>
          ))}
        </p>
      )
    }
  </div>
</section>

<style>
  .actions {
    margin-top: var(--space-l);
  }
  .email {
    margin-top: var(--space-m);
    font-family: var(--font-display);
    font-size: var(--step-1);
  }
  .profiles {
    margin-top: var(--space-s);
    color: var(--muted);
  }
</style>
```

- [ ] **Step 5: Home completa nell'ordine della spec**

`src/pages/[lang]/index.astro`:
```astro
---
import Base from '../../layouts/Base.astro';
import Hero from '../../components/Hero.astro';
import Services from '../../components/Services.astro';
import CaseStudies from '../../components/CaseStudies.astro';
import Process from '../../components/Process.astro';
import Experience from '../../components/Experience.astro';
import Contact from '../../components/Contact.astro';
import { LANGS, type Lang, t } from '../../i18n/utils';

export function getStaticPaths() {
  return LANGS.map((lang) => ({ params: { lang } }));
}

const lang = Astro.params.lang as Lang;
---

<Base lang={lang} path="/" title={t(lang, 'meta.title')} description={t(lang, 'meta.description')}>
  <Hero lang={lang} />
  <Services lang={lang} />
  <CaseStudies lang={lang} />
  <Process lang={lang} />
  <Experience lang={lang} />
  <Contact lang={lang} />
</Base>
```

- [ ] **Step 6: Test, build e controlli**

Run: `npm test && npm run build`
Expected: tutti i test PASS; `astro check` 0 errori; `check-dist: … nessun problema`.

- [ ] **Step 7: Verifica visiva**

Run: `npx astro dev`. Su `/it/` e `/en/`:
- l'ordine delle sezioni è Hero → Servizi → Progetti → Come lavoro → Esperienza → Contatti;
- i link dell'header portano alle sezioni giuste;
- con `SITE.links` tutti a `null` non compaiono "Prenota una call" né "Mi trovi anche su";
- a 360px nessuno scroll orizzontale; le date dell'esperienza vanno sopra il titolo.

Ferma il server.

- [ ] **Step 8: Checkpoint**

Avvisa l'utente: pronto per il commit (`feat: sezioni servizi, metodo, esperienza, contatti`). Non eseguire git.

---

### Task 7: Docker, nginx e deploy

**Files:**
- Create: `Dockerfile`, `.dockerignore`, `docker-compose.yml`
- Create: `deploy/nginx/default.conf`, `deploy/nginx/security-headers.conf`
- Create: `deploy/host-nginx.conf.example`, `deploy/smoke-test.sh`, `deploy/README.md`

**Interfaces:**
- Consumes: `npm test`, `npm run build` → `dist/` (Task 1-6).
- Produces: container in ascolto su `127.0.0.1:${PORTFOLIO_PORT:-8085}`; `deploy/smoke-test.sh [base_url]` riutilizzabile anche in produzione.

- [ ] **Step 1: Configurazione nginx del container**

`deploy/nginx/security-headers.conf`:
```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header X-Frame-Options "DENY" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Content-Security-Policy "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" always;
```

`deploy/nginx/default.conf`:
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Redirect relativi (es. /it -> /it/): restano corretti dietro il reverse proxy HTTPS dell'host
    absolute_redirect off;
    server_tokens off;

    gzip on;
    gzip_comp_level 6;
    gzip_min_length 1024;
    gzip_types text/css application/javascript text/javascript image/svg+xml application/xml text/xml text/plain application/json;

    error_page 404 /404.html;

    location = /404.html {
        internal;
        include /etc/nginx/snippets/security-headers.conf;
        add_header Cache-Control "no-cache";
    }

    # Asset con hash nel nome: cache lunga
    location /_astro/ {
        include /etc/nginx/snippets/security-headers.conf;
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    # HTML e file senza hash: sempre rivalidati
    location / {
        include /etc/nginx/snippets/security-headers.conf;
        add_header Cache-Control "no-cache";
        try_files $uri $uri/ =404;
    }
}
```

Nota: gli `add_header` non si ereditano tra blocchi `location` se il blocco ne definisce di propri. Per questo gli header di sicurezza sono inclusi in ogni `location`.

- [ ] **Step 2: Dockerfile, .dockerignore, compose**

`Dockerfile`:
```dockerfile
# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm test && npm run build

FROM nginx:stable-alpine
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY deploy/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1/it/ || exit 1
```

`.dockerignore`:
```
node_modules
dist
.astro
.git
docs
*.log
.env
```

`docker-compose.yml`:
```yaml
services:
  portfolio:
    build: .
    image: portfolio:latest
    container_name: portfolio
    restart: unless-stopped
    ports:
      - "127.0.0.1:${PORTFOLIO_PORT:-8085}:80"
    read_only: true
    tmpfs:
      - /var/cache/nginx
      - /run
      - /tmp
```

- [ ] **Step 3: Smoke test**

`deploy/smoke-test.sh`:
```bash
#!/usr/bin/env bash
# Smoke test del sito servito da nginx (container locale o produzione).
# Uso: deploy/smoke-test.sh [base_url]
#      default: http://127.0.0.1:${PORTFOLIO_PORT:-8085}
set -uo pipefail

BASE="${1:-http://127.0.0.1:${PORTFOLIO_PORT:-8085}}"
failures=0

pass() { echo "ok   - $1"; }
fail() { echo "FAIL - $1"; failures=$((failures + 1)); }

expect_eq() { # descrizione, atteso, ottenuto
  if [[ "$3" == "$2" ]]; then pass "$1"; else fail "$1 (atteso '$2', ottenuto '$3')"; fi
}

expect_match() { # descrizione, regex, testo
  if [[ "$3" =~ $2 ]]; then pass "$1"; else fail "$1 (nessun match per '$2')"; fi
}

status() { curl -s -o /dev/null -w '%{http_code}' "$1"; }

# header URL NOME [opzioni curl...]
header() {
  curl -s -D - -o /dev/null "${@:3}" "$1" | tr -d '\r' | grep -i "^$2:" | head -1 | cut -d' ' -f2-
}

for path in / /it/ /en/ /it/progetti/gestionale-lab/ /en/progetti/gestionale-lab/ \
  /cv/cv-it.pdf /cv/cv-en.pdf /lang-redirect.js /sitemap-index.xml /robots.txt; do
  expect_eq "GET $path -> 200" 200 "$(status "$BASE$path")"
done

expect_eq "slash mancante -> 301" 301 "$(status "$BASE/it/progetti/gestionale-lab")"
expect_eq "redirect con Location relativa" "/it/progetti/gestionale-lab/" \
  "$(header "$BASE/it/progetti/gestionale-lab" location)"

expect_eq "pagina inesistente -> 404" 404 "$(status "$BASE/non-esiste/")"
expect_match "pagina 404 personalizzata" "Pagina non trovata" "$(curl -s "$BASE/non-esiste/")"

expect_match "CSP presente" "default-src 'self'" "$(header "$BASE/it/" content-security-policy)"
expect_eq "nosniff presente" "nosniff" "$(header "$BASE/it/" x-content-type-options)"
expect_eq "HTML sempre rivalidato" "no-cache" "$(header "$BASE/it/" cache-control)"
expect_match "HTML compresso con gzip" "gzip" "$(header "$BASE/it/" content-encoding -H 'Accept-Encoding: gzip')"
expect_match "CV servito come PDF" "application/pdf" "$(header "$BASE/cv/cv-it.pdf" content-type)"

asset="$(curl -s "$BASE/it/" | grep -oE '/_astro/[^"]+\.css' | head -1)"
if [[ -n "$asset" ]]; then
  expect_match "asset /_astro/ immutabili" "immutable" "$(header "$BASE$asset" cache-control)"
  expect_eq "header di sicurezza anche sugli asset" "nosniff" "$(header "$BASE$asset" x-content-type-options)"
else
  fail "nessun CSS /_astro/ trovato in /it/"
fi

echo
if ((failures > 0)); then
  echo "$failures controlli falliti"
  exit 1
fi
echo "Tutti i controlli superati"
```

Run: `chmod +x deploy/smoke-test.sh`

- [ ] **Step 4: Build e avvio del container**

Run:
```bash
docker compose build
docker compose up -d
docker compose ps
docker compose logs --tail=20
```
Expected: build completato (test e check-dist inclusi), container `portfolio` in stato `running` (poi `healthy`). Nei log ci sono solo righe informative, nessun `emerg` o `Read-only file system` bloccante. Un avviso `can not modify /etc/nginx/conf.d/default.conf (read-only file system?)` dello script di entrypoint IPv6 è atteso e innocuo.

Se il container non parte per un errore di scrittura su un percorso, aggiungi quel percorso a `tmpfs` in `docker-compose.yml` e ripeti.

- [ ] **Step 5: Esegui lo smoke test**

Run: `deploy/smoke-test.sh`
Expected: tutte le righe `ok`, ultima riga `Tutti i controlli superati`.

- [ ] **Step 6: Configurazione esempio per il nginx dell'host**

`deploy/host-nginx.conf.example`:
```nginx
# Esempio per il nginx dell'HOST (VPS), es. /etc/nginx/sites-available/boarbyte.it
# Adatta porta e nomi al tuo setup, poi:
#   sudo ln -s /etc/nginx/sites-available/boarbyte.it /etc/nginx/sites-enabled/
#   sudo nginx -t && sudo systemctl reload nginx
#   sudo certbot --nginx -d boarbyte.it -d www.boarbyte.it
server {
    listen 80;
    listen [::]:80;
    server_name boarbyte.it www.boarbyte.it;

    location / {
        proxy_pass http://127.0.0.1:8085;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Dopo certbot, nel blocco "listen 443 ssl" che certbot ha creato, aggiungi:
#   add_header Strict-Transport-Security "max-age=31536000" always;
#
# Per avere un solo indirizzo canonico (senza www), sostituisci "www.boarbyte.it"
# nel server_name con un blocco dedicato:
#   server {
#       listen 443 ssl;
#       listen [::]:443 ssl;
#       server_name www.boarbyte.it;
#       # ssl_certificate / ssl_certificate_key: gli stessi percorsi scritti da certbot
#       return 301 https://boarbyte.it$request_uri;
#   }
```

- [ ] **Step 7: Guida al deploy**

`deploy/README.md`:
````md
# Deploy su VPS

Il sito gira in un container nginx che ascolta solo su `127.0.0.1:8085`.
Il nginx già presente sul VPS fa da reverse proxy e gestisce HTTPS con certbot.

## Prima del primo deploy

- [ ] CV reali in `public/cv/cv-it.pdf` e `public/cv/cv-en.pdf` (ora sono placeholder)
- [ ] `src/config.ts`: email, P.IVA (se presente), LinkedIn, GitHub, link prenotazione call
- [ ] Cover reali dei casi studio in `src/assets/projects/` (screenshot con dati fittizi)
- [ ] Testi rivisti in `src/i18n/*.json` e `src/content/projects/`
- [ ] DNS: record `A` (e `AAAA` se il VPS ha IPv6) per `boarbyte.it` e `www.boarbyte.it` verso l'IP del VPS

## Primo deploy

```bash
# sul VPS
git clone <url-del-repo> ~/portfolio && cd ~/portfolio
docker compose up -d --build        # PORTFOLIO_PORT=xxxx per cambiare porta
deploy/smoke-test.sh                # verifica il container in locale

sudo cp deploy/host-nginx.conf.example /etc/nginx/sites-available/boarbyte.it
# adatta porta/nomi se necessario
sudo ln -s /etc/nginx/sites-available/boarbyte.it /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d boarbyte.it -d www.boarbyte.it

deploy/smoke-test.sh https://boarbyte.it
```

## Aggiornamenti

```bash
cd ~/portfolio && git pull && docker compose up -d --build && deploy/smoke-test.sh
```

Il build nel container esegue test e controlli: se qualcosa non va, l'immagine non viene creata
e il sito online resta quello precedente.
````

- [ ] **Step 8: Spegni il container locale**

Run: `docker compose down`
Expected: container rimosso.

- [ ] **Step 9: Checkpoint**

Avvisa l'utente: pronto per il commit (`feat: Docker, nginx e guida al deploy`). Non eseguire git.

---

### Task 8: Verifica finale, scelta dello stile e consegna

**Files:**
- Modify (solo se l'utente sceglie un'altra variante): `src/styles/global.css` (`--accent`, eventualmente `--font-display`), `package.json` (pacchetto font)

**Interfaces:**
- Consumes: tutto il sito; container dal Task 7.

- [ ] **Step 1: Lighthouse**

Run:
```bash
docker compose up -d --build
which google-chrome chromium chromium-browser || echo "nessun Chrome in WSL"
```
Se c'è un Chrome in WSL:
```bash
for url in http://127.0.0.1:8085/it/ http://127.0.0.1:8085/it/progetti/gestionale-lab/; do
  npx --yes lighthouse "$url" --form-factor=mobile \
    --only-categories=performance,accessibility,best-practices,seo \
    --chrome-flags="--headless=new" --quiet --output=json --output-path=stdout \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s);console.log(r.finalDisplayedUrl,Object.values(r.categories).map(c=>c.id+'='+Math.round(c.score*100)).join(' '))})"
done
```
Altrimenti chiedi all'utente di aprire `http://localhost:8085/it/` in Chrome su Windows, DevTools → Lighthouse → Mobile → le 4 categorie, e di riportare i punteggi.

Expected: ≥ 95 in tutte e 4 le categorie su entrambe le pagine. Sotto 95: leggi gli audit falliti, correggi, rifai il build e ripeti.

Nota: su HTTP locale "Best Practices" può segnalare l'assenza di HTTPS. Quel punto si verifica in produzione.

- [ ] **Step 2: Controllo manuale a 360px e da tastiera**

In Chrome (DevTools → responsive, larghezza 360px) su `/it/`, `/en/` e su una pagina caso studio:
- nessuno scroll orizzontale;
- titoli lunghi e parole lunghe vanno a capo (prova temporaneamente un titolo di caso studio come "Containerizzazione e orchestrazione dell'infrastruttura applicativa");
- con `Tab` dall'inizio pagina compare per primo "Vai al contenuto", e ogni elemento interattivo ha il focus visibile;
- il cambio lingua su un caso studio porta allo stesso caso studio nell'altra lingua;
- con JavaScript disattivato (DevTools → Command menu → "Disable JavaScript"), `http://localhost:8085/` porta a `/it/`.

- [ ] **Step 3: Scelta del colore d'accento con l'utente**

Con il sito aperto, mostra all'utente 3 varianti cambiando solo `--accent` in `src/styles/global.css` (con `npx astro dev` il cambio è immediato):

| Variante | `--accent` | Carattere |
|---|---|---|
| A (attuale) | `#c2410c` terracotta | caldo, artigianale, si ricorda |
| B | `#0f5e78` blu petrolio | affidabile, istituzionale |
| C | `#2f6b3f` verde bosco | sobrio, solido |

Tutte superano il contrasto AA su `--bg` come colore di testo. Se l'utente vuole provare un altro font per i titoli, l'alternativa è `@fontsource-variable/newsreader`: `npm install @fontsource-variable/newsreader`, cambia l'import in `Base.astro` e `404.astro` e imposta `--font-display: 'Newsreader Variable', Georgia, serif`. Applica la scelta, poi rigenera og.png e cover se il colore è cambiato: aggiorna `ACCENT` in `scripts/make-images.mjs` ed esegui `npm run images -- --force` **solo se** le cover sono ancora placeholder.

- [ ] **Step 4: Build finale**

Run: `npm test && npm run build && docker compose up -d --build && deploy/smoke-test.sh && docker compose down`
Expected: tutto verde.

- [ ] **Step 5: Consegna**

Riporta all'utente:
- punteggi Lighthouse;
- elenco dei contenuti da fornire o confermare (spec §7):
  - CV PDF reali (IT/EN) in `public/cv/`;
  - email, P.IVA, LinkedIn, GitHub, link call in `src/config.ts`;
  - screenshot reali del gestionale (dati fittizi) in `src/assets/projects/`;
  - testi da confermare: anno di inizio "2020", nome del corso di laurea, stack del gestionale (PostgreSQL?), stack in `STACK` (TypeScript?), la frase "prima chiacchierata gratuita", eventuali link GitHub/demo dei casi studio;
- i passi di `deploy/README.md` per andare online su `boarbyte.it`.

Ricorda all'utente che tutto il lavoro è pronto per il commit. Non eseguire git.
