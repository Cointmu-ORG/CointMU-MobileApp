import {
  DEFAULT_ACCENT,
  isAccentId,
  isThemePreference,
  type AccentId,
  type ThemePreference,
} from '../ui/theme/build-theme';

export const DENSITIES = ['comfortable', 'compact'] as const;
export type Density = (typeof DENSITIES)[number];

/** Follow the device's reduce-motion setting, or always reduce. */
export const MOTION_PREFERENCES = ['auto', 'reduced'] as const;
export type MotionPreference = (typeof MOTION_PREFERENCES)[number];

/** Clock style: follow the app language, or force 12 / 24 hours. */
export const TIME_FORMATS = ['auto', '12h', '24h'] as const;
export type TimeFormat = (typeof TIME_FORMATS)[number];

/** Decimals shown for balances; "full" is the exact amount. Display only. */
export const BALANCE_DECIMAL_OPTIONS = [2, 4, 6, 'full'] as const;
export type BalanceDecimals = (typeof BALANCE_DECIMAL_OPTIONS)[number];

/** Display preferences. None of them is a secret, and none changes stored or sent data. */
export type AppearancePrefs = {
  readonly theme: ThemePreference;
  readonly accent: AccentId;
  readonly density: Density;
  /** Text grows with the device's text size setting; off keeps the standard size. */
  readonly followsSystemTextSize: boolean;
  readonly motion: MotionPreference;
  readonly timeFormat: TimeFormat;
  readonly balanceDecimals: BalanceDecimals;
  readonly hidesZeroBalanceTokens: boolean;
  /** Amounts show as •••• until the user taps the eye. */
  readonly hidesBalances: boolean;
  /** Covers the app in the app switcher and whenever it is not in the foreground. */
  readonly hidesAppInSwitcher: boolean;
};

export const DEFAULT_APPEARANCE: AppearancePrefs = {
  theme: 'system',
  accent: DEFAULT_ACCENT,
  density: 'comfortable',
  followsSystemTextSize: true,
  motion: 'auto',
  timeFormat: 'auto',
  // The fraction digits balances showed before this setting existed.
  balanceDecimals: 6,
  hidesZeroBalanceTokens: false,
  hidesBalances: false,
  hidesAppInSwitcher: false,
};

export const APPEARANCE_STORAGE_VERSION = 1;

function oneOf<T>(options: readonly T[], value: unknown, fallback: T): T {
  return (options as readonly unknown[]).includes(value) ? (value as T) : fallback;
}

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/**
 * Turns whatever is in storage into valid preferences: nothing stored yet (first run after the
 * update), an older or partial shape, or a value this build no longer offers (an accent that was
 * dropped). Each field falls back to its default on its own, so one bad value never resets the
 * rest.
 */
export function migrateAppearance(persisted: unknown): AppearancePrefs {
  const stored =
    typeof persisted === 'object' && persisted !== null
      ? (persisted as Record<string, unknown>)
      : {};
  const defaults = DEFAULT_APPEARANCE;
  return {
    theme: isThemePreference(stored.theme) ? stored.theme : defaults.theme,
    accent: isAccentId(stored.accent) ? stored.accent : defaults.accent,
    density: oneOf(DENSITIES, stored.density, defaults.density),
    followsSystemTextSize: flag(stored.followsSystemTextSize, defaults.followsSystemTextSize),
    motion: oneOf(MOTION_PREFERENCES, stored.motion, defaults.motion),
    timeFormat: oneOf(TIME_FORMATS, stored.timeFormat, defaults.timeFormat),
    balanceDecimals: oneOf(
      BALANCE_DECIMAL_OPTIONS,
      stored.balanceDecimals,
      defaults.balanceDecimals,
    ),
    hidesZeroBalanceTokens: flag(stored.hidesZeroBalanceTokens, defaults.hidesZeroBalanceTokens),
    hidesBalances: flag(stored.hidesBalances, defaults.hidesBalances),
    hidesAppInSwitcher: flag(stored.hidesAppInSwitcher, defaults.hidesAppInSwitcher),
  };
}
