import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_APPEARANCE, migrateAppearance } from './appearance-prefs';
import { useAppearanceStore } from './appearance-store';

describe('migrateAppearance', () => {
  it('gives the defaults when nothing was stored (first start after the update)', () => {
    expect(migrateAppearance(undefined)).toEqual(DEFAULT_APPEARANCE);
    expect(migrateAppearance(null)).toEqual(DEFAULT_APPEARANCE);
    expect(migrateAppearance('junk')).toEqual(DEFAULT_APPEARANCE);
  });

  it('keeps every valid stored value', () => {
    const stored = {
      theme: 'dark',
      accent: 'purple',
      density: 'compact',
      followsSystemTextSize: false,
      motion: 'reduced',
      timeFormat: '24h',
      balanceDecimals: 'full',
      hidesZeroBalanceTokens: true,
      hidesBalances: true,
      hidesAppInSwitcher: true,
    };
    expect(migrateAppearance(stored)).toEqual(stored);
  });

  it('fills a partial record and replaces only the invalid fields', () => {
    const migrated = migrateAppearance({
      theme: 'dark',
      // The desktop stores "auto" and a hex accent; neither is a mobile value.
      motion: 'on',
      accent: '#3b82f6',
      balanceDecimals: 3,
      hidesBalances: 'yes',
    });
    expect(migrated).toEqual({ ...DEFAULT_APPEARANCE, theme: 'dark' });
  });
});

describe('appearance store', () => {
  it('applies a change at once and persists only the preferences', async () => {
    useAppearanceStore.getState().update({ theme: 'dark', accent: 'emerald' });
    expect(useAppearanceStore.getState().theme).toBe('dark');

    await Promise.resolve();
    const raw = await AsyncStorage.getItem('muvo.appearance');
    const { state, version } = JSON.parse(raw ?? '{}') as {
      state: Record<string, unknown>;
      version: number;
    };
    expect(version).toBe(1);
    expect(state).toEqual({ ...DEFAULT_APPEARANCE, theme: 'dark', accent: 'emerald' });
  });

  it('survives a stored record with values this build does not know', async () => {
    await AsyncStorage.setItem(
      'muvo.appearance',
      JSON.stringify({ state: { theme: 'sepia', accent: 'red', density: 'spacious' }, version: 1 }),
    );
    await useAppearanceStore.persist.rehydrate();

    const { theme, accent, density } = useAppearanceStore.getState();
    expect({ theme, accent, density }).toEqual({
      theme: DEFAULT_APPEARANCE.theme,
      accent: 'red',
      density: DEFAULT_APPEARANCE.density,
    });
  });
});
