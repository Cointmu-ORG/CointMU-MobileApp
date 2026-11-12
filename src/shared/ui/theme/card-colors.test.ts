import { buildThemeColors, DEFAULT_ACCENT, type ColorScheme } from './build-theme';
import { CARD_COLOR_IDS, cardColorAt, cardFill, isCardColorId } from './card-colors';
import cardColors from './card-colors.json';
import { contrastRatio } from './color-math';

const AA_TEXT = 4.5;
const SCHEMES: readonly ColorScheme[] = ['light', 'dark'];

describe('card colors', () => {
  it('lists every color of the palette once', () => {
    expect([...CARD_COLOR_IDS].sort()).toEqual(Object.keys(cardColors).sort());
  });

  it.each(SCHEMES.flatMap((scheme) => CARD_COLOR_IDS.map((id) => [scheme, id] as const)))(
    '%s %s keeps card text and the badge at AA',
    (scheme, id) => {
      const fill = cardFill(id, scheme);
      const { content } = buildThemeColors(scheme, DEFAULT_ACCENT);
      // Text and icons on the card, and the badge (fill-colored text on an inverse pill).
      expect(contrastRatio(content.inverse, fill)).toBeGreaterThanOrEqual(AA_TEXT);
    },
  );

  it('wraps around the palette and rejects unknown ids', () => {
    expect(cardColorAt(0)).toBe(CARD_COLOR_IDS[0]);
    expect(cardColorAt(CARD_COLOR_IDS.length)).toBe(CARD_COLOR_IDS[0]);
    expect(isCardColorId('ocean')).toBe(true);
    expect(isCardColorId('neon')).toBe(false);
  });
});
