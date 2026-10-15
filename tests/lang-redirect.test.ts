import { describe, expect, it as test } from 'vitest';
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
