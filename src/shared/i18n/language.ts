import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Language } from '@/shared/config';

import { i18n, isSupportedLanguage } from './i18n';

// A display preference, not a secret. Survives a wallet reset on purpose.
const LANGUAGE_KEY = 'muvo.language';

/** Applies the language the user picked earlier. Run during bootstrap, before the first screen. */
export async function restoreLanguage(): Promise<void> {
  const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
  if (isSupportedLanguage(stored) && stored !== i18n.language) await i18n.changeLanguage(stored);
}

/** Switches the app language now and remembers it; until then the device language is used. */
export async function setLanguage(language: Language): Promise<void> {
  await i18n.changeLanguage(language);
  await AsyncStorage.setItem(LANGUAGE_KEY, language);
}
