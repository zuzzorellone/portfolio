import { describe, expect, it as test } from 'vitest';
import { STACK } from '../src/config';

describe('STACK', () => {
  test('distingue lo stack usato al lavoro da quello dei progetti personali', () => {
    expect(Object.keys(STACK).sort()).toEqual(['personal', 'work']);
    expect(STACK.work.length).toBeGreaterThan(0);
    expect(STACK.personal.length).toBeGreaterThan(0);
  });

  // Le voci di STACK compaiono identiche su /it/ e /en/: devono essere neutre rispetto alla lingua
  test('nessuna voce contiene congiunzioni italiane o inglesi', () => {
    for (const item of Object.values(STACK).flat()) {
      expect(item, item).not.toMatch(/\s(e|and)\s/i);
    }
  });
});
