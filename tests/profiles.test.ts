import { describe, expect, it as test } from 'vitest';
import { profileLinks } from '../src/lib/profiles';

describe('profileLinks', () => {
  test('nessun profilo se i link sono null', () => {
    expect(profileLinks({ github: null, linkedin: null, booking: null })).toEqual([]);
  });

  test('solo i profili impostati, GitHub prima di LinkedIn', () => {
    expect(
      profileLinks({ linkedin: 'https://www.linkedin.com/in/x/', github: 'https://github.com/x', booking: null }),
    ).toEqual([
      { kind: 'github', label: 'GitHub', url: 'https://github.com/x' },
      { kind: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/in/x/' },
    ]);
    expect(profileLinks({ github: null, linkedin: 'https://www.linkedin.com/in/x/', booking: null })).toEqual([
      { kind: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/in/x/' },
    ]);
  });
});
