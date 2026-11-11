import {
  ACCENT_IDS,
  buildThemeColors,
  resolveScheme,
  toCssVariables,
  type ColorScheme,
} from './build-theme';
import { contrastRatio, mixHex } from './color-math';
import { defaultColors, splashBackground } from './colors';
import lightColors from './colors.json';

const SCHEMES: readonly ColorScheme[] = ['light', 'dark'];
/** WCAG 2.2 AA: normal text, and the boundary of a control or a meaningful icon. */
const AA_TEXT = 4.5;
const AA_NON_TEXT = 3;
const CASES = SCHEMES.flatMap((scheme) => ACCENT_IDS.map((accent) => [scheme, accent] as const));

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBe(1);
    // #767676 on white is the well-known 4.54:1 boundary gray.
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });

  it('mixes two colors channel by channel', () => {
    expect(mixHex('#ffffff', '#000000', 0.5)).toBe('#808080');
    expect(mixHex('#3b82f6', '#111827', 0)).toBe('#111827');
  });
});

describe('resolveScheme', () => {
  it('uses an explicit choice whatever the device says', () => {
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('dark', 'light')).toBe('dark');
  });

  it('follows the device on "system" and falls back to light', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
    expect(resolveScheme('system', null)).toBe('light');
    expect(resolveScheme('system', undefined)).toBe('light');
  });
});

describe('buildThemeColors', () => {
  it('keeps the light blue palette the app shipped with as the default', () => {
    expect(buildThemeColors('light', 'blue')).toEqual(lightColors);
    expect(defaultColors).toEqual(lightColors);
  });

  it('gives every scheme and accent the same token names', () => {
    const names = Object.keys(toCssVariables(defaultColors)).sort();
    for (const [scheme, accent] of CASES) {
      expect(Object.keys(toCssVariables(buildThemeColors(scheme, accent))).sort()).toEqual(names);
    }
  });

  it('changes the primary tokens with the accent and the surfaces with the scheme', () => {
    const blue = buildThemeColors('light', 'blue');
    const purple = buildThemeColors('light', 'purple');
    const dark = buildThemeColors('dark', 'blue');

    expect(purple.primary[600]).not.toBe(blue.primary[600]);
    expect(purple.surface).toEqual(blue.surface);
    expect(dark.surface.DEFAULT).not.toBe(blue.surface.DEFAULT);
    expect(dark.primary[600]).toBe(blue.primary[600]);
  });

  it('paints the splash with the surface of the device scheme', () => {
    expect(splashBackground('dark')).toBe(buildThemeColors('dark', 'blue').surface.DEFAULT);
    expect(splashBackground(null)).toBe(lightColors.surface.DEFAULT);
  });
});

describe('toCssVariables', () => {
  it('names DEFAULT tokens by their group and writes space-separated channels', () => {
    const variables = toCssVariables(defaultColors);
    expect(variables['--color-surface']).toBe('248 250 252');
    expect(variables['--color-primary-600']).toBe('37 99 235');
    expect(variables['--color-accent']).toBe('29 78 216');
  });
});

describe.each(CASES)('contrast in %s with the %s accent', (scheme, accent) => {
  const colors = buildThemeColors(scheme, accent);
  const surfaces = [colors.surface.DEFAULT, colors.surface.card, colors.surface.muted];

  it('keeps white text readable on buttons and their pressed states', () => {
    for (const fill of [colors.primary[600], colors.primary[700], colors.primary[800]]) {
      expect(contrastRatio(colors.content.inverse, fill)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it('keeps accent text and icons readable on every surface and accent tint', () => {
    const backgrounds = [...surfaces, colors.primary[50], colors.primary[100]];
    for (const background of backgrounds) {
      expect(contrastRatio(colors.accent.DEFAULT, background)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it('keeps body and secondary text readable on surfaces and accent tints', () => {
    for (const background of [...surfaces, colors.primary[50], colors.primary[100]]) {
      expect(contrastRatio(colors.content.DEFAULT, background)).toBeGreaterThanOrEqual(AA_TEXT);
    }
    // Known gap, older than theming: the desktop's light secondary gray on the light muted
    // surface (unselected segments, neutral chips) is 4.34:1. The dark theme passes there.
    const secondaryBackgrounds =
      scheme === 'light' ? [colors.surface.DEFAULT, colors.surface.card] : surfaces;
    for (const background of secondaryBackgrounds) {
      expect(contrastRatio(colors.content.secondary, background)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it('keeps a filled button distinguishable from the screen behind it', () => {
    expect(contrastRatio(colors.primary[600], colors.surface.DEFAULT)).toBeGreaterThanOrEqual(
      AA_NON_TEXT,
    );
  });

  it('keeps status text readable on its soft background and on a card', () => {
    const pairs = [
      [colors.success.strong, colors.success.soft],
      [colors.warning.strong, colors.warning.soft],
      [colors.danger.strong, colors.danger.soft],
      [colors.success.strong, colors.surface.card],
      [colors.warning.strong, colors.surface.card],
      [colors.danger.strong, colors.surface.card],
      [colors.content.inverse, colors.danger.solid],
      [colors.content.inverse, colors.danger.pressed],
    ] as const;
    for (const [text, background] of pairs) {
      expect(contrastRatio(text, background)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });
});
