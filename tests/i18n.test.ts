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

describe('hero', () => {
  test('tre fatti chiave con valore ed etichetta in entrambe le lingue', () => {
    for (const dict of [itDict, enDict] as Record<string, string>[]) {
      for (const n of [1, 2, 3]) {
        expect(dict[`hero.fact.${n}.value`], `hero.fact.${n}.value`).toBeTruthy();
        expect(dict[`hero.fact.${n}.label`], `hero.fact.${n}.label`).toBeTruthy();
      }
    }
  });
});

describe('sezioni orientate ai recruiter', () => {
  const required = [
    'hero.status',
    'hero.ctaContact',
    ...[1, 2, 3].flatMap((n) => [`hero.fact.${n}.value`, `hero.fact.${n}.label`]),
    ...[1, 2, 3, 4].map((n) => `experience.job.duty.${n}`),
    'experience.stack.work',
    'experience.stack.personal',
    'freelance.label',
    'freelance.title',
    'freelance.lead',
    ...[1, 2, 3].flatMap((n) => [`freelance.${n}.title`, `freelance.${n}.body`]),
    'freelance.process',
    'nav.freelance',
  ];

  test('tutte le chiavi richieste esistono in entrambe le lingue', () => {
    for (const dict of [itDict, enDict] as Record<string, string>[]) {
      for (const key of required) expect(dict[key], key).toBeTruthy();
    }
  });

  test('le vecchie sezioni Servizi e Come lavoro sono state rimosse', () => {
    const stale = Object.keys(itDict).filter((k) => k.startsWith('services.') || k.startsWith('process.'));
    expect(stale).toEqual([]);
  });
});
