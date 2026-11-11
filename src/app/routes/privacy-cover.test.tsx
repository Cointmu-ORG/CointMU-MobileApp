import { act, render, screen } from '@testing-library/react-native';
import * as ScreenCapture from 'expo-screen-capture';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import { DEFAULT_APPEARANCE, useAppearanceStore, usePrivacyRevealStore } from '@/shared/model';

import { PrivacyCover } from './privacy-cover';

jest.mock('expo-screen-capture', () => ({
  enableAppSwitcherProtectionAsync: jest.fn(async () => undefined),
  disableAppSwitcherProtectionAsync: jest.fn(async () => undefined),
  preventScreenCaptureAsync: jest.fn(async () => undefined),
  allowScreenCaptureAsync: jest.fn(async () => undefined),
}));

let emit: (state: AppStateStatus) => void = () => undefined;

// The cover is hidden from screen readers on purpose, so the query must include hidden elements.
const cover = () => screen.queryByTestId('privacy-cover', { includeHiddenElements: true });

beforeEach(() => {
  jest.clearAllMocks();
  useAppearanceStore.setState(DEFAULT_APPEARANCE);
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    emit = handler as typeof emit;
    return { remove: jest.fn() };
  });
});

afterEach(() => jest.restoreAllMocks());

describe('PrivacyCover', () => {
  it('covers the app while it is not in front, when the setting is on', async () => {
    useAppearanceStore.setState({ hidesAppInSwitcher: true });
    await render(<PrivacyCover />);
    expect(cover()).toBeNull();

    await act(() => emit('inactive'));
    expect(cover()).not.toBeNull();

    await act(() => emit('active'));
    expect(cover()).toBeNull();
  });

  it('never covers the app while the setting is off', async () => {
    await render(<PrivacyCover />);
    await act(() => emit('background'));
    expect(cover()).toBeNull();
  });

  it('turns the native app switcher protection on and off with the setting', async () => {
    await render(<PrivacyCover />);
    expect(ScreenCapture.enableAppSwitcherProtectionAsync).not.toHaveBeenCalled();

    await act(() => useAppearanceStore.getState().update({ hidesAppInSwitcher: true }));
    expect(ScreenCapture.enableAppSwitcherProtectionAsync).toHaveBeenCalledTimes(1);

    await act(() => useAppearanceStore.getState().update({ hidesAppInSwitcher: false }));
    expect(ScreenCapture.disableAppSwitcherProtectionAsync).toHaveBeenCalled();
  });

  it('uses its own capture key on Android, so the phrase and key screens stay blocked', async () => {
    Platform.OS = 'android';
    try {
      useAppearanceStore.setState({ hidesAppInSwitcher: true });
      await render(<PrivacyCover />);
      await act(() => useAppearanceStore.getState().update({ hidesAppInSwitcher: false }));

      expect(ScreenCapture.preventScreenCaptureAsync).toHaveBeenCalledWith('muvo.privacy-cover');
      // Only the cover's own key is released; the default key of the secret screens is not.
      expect(jest.mocked(ScreenCapture.allowScreenCaptureAsync).mock.calls).toEqual([
        ['muvo.privacy-cover'],
      ]);
    } finally {
      Platform.OS = 'ios';
    }
  });

  it('ends a temporary balance reveal when the app leaves the foreground', async () => {
    await render(<PrivacyCover />);
    usePrivacyRevealStore.getState().revealTemporarily();

    await act(() => emit('background'));
    expect(usePrivacyRevealStore.getState().isRevealed).toBe(false);
  });
});
