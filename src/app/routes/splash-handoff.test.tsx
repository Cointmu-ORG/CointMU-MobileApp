import { renderRouter, screen } from 'expo-router/testing-library';
import * as SplashScreen from 'expo-splash-screen';

import { useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';
import { colors } from '@/shared/ui';

import appJson from '../../../app.json';

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(async () => true),
  hide: jest.fn(),
}));

type PluginEntry = string | [string, Record<string, unknown>];

describe('splash', () => {
  it('uses the surface token as the native splash background', () => {
    const plugins = appJson.expo.plugins as PluginEntry[];
    const splash = plugins.find(
      (entry) => Array.isArray(entry) && entry[0] === 'expo-splash-screen',
    );
    expect(splash?.[1]).toMatchObject({ backgroundColor: colors.surface.DEFAULT });
  });

  it('holds the native splash until bootstrap is done, then hides it', async () => {
    await i18n.changeLanguage('en');
    useWalletStore.getState().reset();

    await renderRouter('./app', { initialUrl: '/' });
    expect(await screen.findByText('Welcome to Muvo')).toBeOnTheScreen();

    const hold = jest.mocked(SplashScreen.preventAutoHideAsync).mock.invocationCallOrder;
    const hide = jest.mocked(SplashScreen.hide).mock.invocationCallOrder;
    expect(hide).toHaveLength(1);
    expect(hold[0]).toBeLessThan(hide[0] ?? 0);
  });
});
