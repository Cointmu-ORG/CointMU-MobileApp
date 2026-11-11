import * as ScreenCapture from 'expo-screen-capture';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { logger } from '@/shared/lib';
import { useAppearanceStore, usePrivacyRevealStore } from '@/shared/model';

/** Its own key, so turning the cover off never lifts the block on the phrase and key screens. */
const APP_SWITCHER_CAPTURE_KEY = 'muvo.privacy-cover';
const APP_SWITCHER_BLUR = 1;

function setNativeProtection(isOn: boolean): Promise<void> {
  if (Platform.OS === 'ios') {
    return isOn
      ? ScreenCapture.enableAppSwitcherProtectionAsync(APP_SWITCHER_BLUR)
      : ScreenCapture.disableAppSwitcherProtectionAsync();
  }
  // Android has one switch for both: FLAG_SECURE blanks the recents preview and also blocks
  // screenshots of the whole app while the setting is on. The setting's description says so.
  return isOn
    ? ScreenCapture.preventScreenCaptureAsync(APP_SWITCHER_CAPTURE_KEY)
    : ScreenCapture.allowScreenCaptureAsync(APP_SWITCHER_CAPTURE_KEY);
}

/**
 * Settings > Appearance > Privacy. Returns true while the JS cover must hide the app: the
 * setting is on and Muvo is not the active app (app switcher, a system sheet, the background).
 * The native protection covers the moments JS cannot render in time. Leaving the foreground
 * also ends a temporary balance reveal, whatever the setting.
 */
export function usePrivacyGuard(): boolean {
  const hidesAppInSwitcher = useAppearanceStore((state) => state.hidesAppInSwitcher);
  const [isActive, setIsActive] = useState(() => AppState.currentState !== 'background');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      setIsActive(next === 'active');
      if (next !== 'active') usePrivacyRevealStore.getState().hide();
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    setNativeProtection(hidesAppInSwitcher).catch((error: unknown) =>
      logger.warn('Changing app switcher protection failed', { error }),
    );
  }, [hidesAppInSwitcher]);

  return hidesAppInSwitcher && !isActive;
}
