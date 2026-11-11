import accents from './accents.json';
import { hexToRgb, mixHex } from './color-math';
import lightColors from './colors.json';
import darkColors from './dark-colors.json';

/** Every color token, as `#rrggbb`. Same shape in both schemes and for every accent. */
export type ThemeColors = typeof lightColors;
export type ColorScheme = 'light' | 'dark';
export type ThemePreference = ColorScheme | 'system';
export type AccentId = keyof typeof accents;

export const THEME_PREFERENCES = [
  'system',
  'light',
  'dark',
] as const satisfies readonly ThemePreference[];
/** Desktop order (Settings > Appearance > Accent color). */
export const ACCENT_IDS = [
  'blue',
  'emerald',
  'indigo',
  'purple',
  'amber',
  'red',
] as const satisfies readonly AccentId[];
export const DEFAULT_ACCENT: AccentId = 'blue';
export const DEFAULT_SCHEME: ColorScheme = 'light';

export function isAccentId(value: unknown): value is AccentId {
  return typeof value === 'string' && (ACCENT_IDS as readonly string[]).includes(value);
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value);
}

/** "System" follows the device; anything the device does not report counts as light. */
export function resolveScheme(
  preference: ThemePreference,
  systemScheme: string | null | undefined,
): ColorScheme {
  if (preference !== 'system') return preference;
  return systemScheme === 'dark' ? 'dark' : DEFAULT_SCHEME;
}

// Ramp positions (Tailwind shades 50…950 are indexes 0…10).
const SHADE_400 = 4;
const SHADE_500 = 5;
const SHADE_900 = 9;
/** Accent tints over the dark card: how much of the accent's 500 shade shows through. */
const DARK_TINT = { 50: 0.14, 100: 0.24, 200: 0.36, 300: 0.5 } as const;

type Ramp = readonly string[];

function shade(ramp: Ramp, index: number): string {
  return ramp[Math.min(index, ramp.length - 1)] ?? '';
}

/**
 * `primary-600/700/800` are fills under white text (buttons and their pressed states), so they
 * start at the accent's first shade that keeps white text at AA: 600 for most, 700 for emerald
 * and amber. `accent` is the accent as text or an icon on a surface: one shade darker than the
 * fill in light, the 400 shade in dark. The light tints (50…300) come from the ramp; the dark
 * ones are the accent mixed into the card color.
 */
function accentColors(
  accent: AccentId,
  scheme: ColorScheme,
): Pick<ThemeColors, 'primary' | 'accent'> {
  const { ramp, fillShade } = accents[accent];
  const fills = {
    '600': shade(ramp, fillShade),
    '700': shade(ramp, fillShade + 1),
    '800': shade(ramp, fillShade + 2),
    '900': shade(ramp, SHADE_900),
  };
  const mid = { '400': shade(ramp, SHADE_400), '500': shade(ramp, SHADE_500) };
  if (scheme === 'light') {
    return {
      primary: {
        '50': shade(ramp, 0),
        '100': shade(ramp, 1),
        '200': shade(ramp, 2),
        '300': shade(ramp, 3),
        ...mid,
        ...fills,
      },
      accent: { DEFAULT: fills['700'] },
    };
  }
  const tint = (amount: number) => mixHex(mid['500'], darkColors.surface.card, amount);
  return {
    primary: {
      '50': tint(DARK_TINT[50]),
      '100': tint(DARK_TINT[100]),
      '200': tint(DARK_TINT[200]),
      '300': tint(DARK_TINT[300]),
      ...mid,
      ...fills,
    },
    accent: { DEFAULT: mid['400'] },
  };
}

/** The full token set for one scheme and accent. Pure: the same input gives the same colors. */
export function buildThemeColors(scheme: ColorScheme, accent: AccentId): ThemeColors {
  const base = scheme === 'dark' ? darkColors : lightColors;
  const { primary, accent: accentToken } = accentColors(accent, scheme);
  return {
    ...lightColors,
    ...base,
    primary,
    accent: accentToken,
    border: { ...base.border, active: primary['500'] },
  };
}

/** The accent's own color, for its swatch in the picker. */
export function accentSwatch(accent: AccentId): string {
  return shade(accents[accent].ramp, SHADE_500);
}

const VARIABLE_PREFIX = '--color';
const DEFAULT_KEY = 'DEFAULT';

/**
 * CSS variables for the root view: `--color-primary-600: "37 99 235"`. Tailwind reads them as
 * `rgb(var(--color-primary-600) / <alpha-value>)` (tailwind.config.js), so every color class
 * follows the theme and the accent at runtime.
 */
export function toCssVariables(colors: ThemeColors): Record<`--${string}`, string> {
  const variables: Record<`--${string}`, string> = {};
  for (const [group, tokens] of Object.entries(colors)) {
    for (const [key, hex] of Object.entries(tokens)) {
      const name = key === DEFAULT_KEY ? group : `${group}-${key}`;
      variables[`${VARIABLE_PREFIX}-${name}`] = hexToRgb(hex).join(' ');
    }
  }
  return variables;
}
