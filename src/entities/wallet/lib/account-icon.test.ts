import { i18n } from '@/shared/i18n';

import { ACCOUNT_EMOJI, ACCOUNT_EMOJI_GROUPS, ACCOUNT_LUCIDE_NAMES } from '../config/account-icons';
import { DEFAULT_ACCOUNT_ICON, defaultAccountIcon, resolveAccountIcon } from './account-icon';

const ALL_EMOJI = ACCOUNT_EMOJI_GROUPS.flatMap((group) => [...group.emoji]);
const graphemes = (text: string) => [...new Intl.Segmenter('en').segment(text)];

describe('resolveAccountIcon', () => {
  it('keeps an offered lucide icon and an offered emoji', () => {
    const piggy = { kind: 'lucide', name: 'piggy-bank' };
    const house = { kind: 'emoji', value: '🏠' };
    expect(resolveAccountIcon(piggy)).toBe(piggy);
    expect(resolveAccountIcon(house)).toBe(house);
  });

  it.each([
    ['a lucide name that was never offered', { kind: 'lucide', name: 'skull' }],
    ['a lucide name that was removed', { kind: 'lucide', name: 'toString' }],
    ['an emoji outside the list', { kind: 'emoji', value: '🏴‍☠️' }],
    ['free text as an emoji', { kind: 'emoji', value: 'hello' }],
    ['an unknown kind', { kind: 'image', uri: 'https://example.com/logo.png' }],
    ['a missing icon', undefined],
    ['a string', 'piggy-bank'],
  ])('falls back to the default for %s', (_case, stored) => {
    expect(resolveAccountIcon(stored)).toEqual(DEFAULT_ACCOUNT_ICON);
    expect(resolveAccountIcon(stored, defaultAccountIcon('private-key'))).toEqual({
      kind: 'lucide',
      name: 'key-round',
    });
  });
});

describe('the offered icons', () => {
  it('has about 30 lucide icons, the two defaults among them', () => {
    expect(ACCOUNT_LUCIDE_NAMES.length).toBeGreaterThanOrEqual(28);
    expect(ACCOUNT_LUCIDE_NAMES).toEqual(expect.arrayContaining(['wallet-minimal', 'key-round']));
  });

  it.each(['en', 'id'])('names every lucide icon and every emoji group in %s', (lng) => {
    const keys = [
      ...ACCOUNT_LUCIDE_NAMES.map((name) => `wallets.icons.lucide.${name}`),
      ...ACCOUNT_EMOJI_GROUPS.map((group) => `wallets.icons.groups.${group.id}`),
    ];
    expect(keys.filter((key) => !i18n.exists(key, { lng, fallbackLng: false }))).toEqual([]);
  });

  it('has 60 to 80 emoji, none twice', () => {
    expect(ALL_EMOJI.length).toBeGreaterThanOrEqual(60);
    expect(ALL_EMOJI.length).toBeLessThanOrEqual(80);
    expect(ACCOUNT_EMOJI.size).toBe(ALL_EMOJI.length);
  });

  it.each(ALL_EMOJI)('%s is one grapheme that every supported phone can draw', (emoji) => {
    expect(graphemes(emoji)).toHaveLength(1);
    // One emoji code point, at most followed by the emoji presentation selector: no joiner
    // sequences, skin tones, flags or keycaps, which older Android draws as boxes.
    expect(emoji).toMatch(/^\p{Extended_Pictographic}️?$/u);
    expect(emoji).not.toMatch(/[\u{1F1E6}-\u{1F1FF}\u{1F3F3}\u{1F3F4}\u{1F3FB}-\u{1F3FF}]/u);
  });
});
