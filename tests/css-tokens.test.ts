import { describe, expect, it as test } from 'vitest';
import { readCssTokens } from '../scripts/lib/css-tokens.mjs';

describe('readCssTokens', () => {
  test('legge le variabili colore da :root', () => {
    const css = `:root {\n  --bg: #faf8f5;\n  --accent:#590F78 ;\n  --font-body: 'Inter';\n}`;
    expect(readCssTokens(css, ['bg', 'accent'])).toEqual({ bg: '#faf8f5', accent: '#590F78' });
  });

  test('errore chiaro se una variabile manca', () => {
    expect(() => readCssTokens(':root { --bg: #fff; }', ['accent'])).toThrow(/--accent/);
  });
});
