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
