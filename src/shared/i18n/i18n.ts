import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { FALLBACK_LANGUAGE, SUPPORTED_LANGUAGES, type Language } from '@/shared/config';

import en from './locales/en.json';
import id from './locales/id.json';

function isSupported(code: string | null): code is Language {
  return SUPPORTED_LANGUAGES.some((language) => language === code);
}

/** Device language when supported, else English (architecture §9). */
export function detectLanguage(): Language {
  const deviceLanguage = getLocales()[0].languageCode;
  return isSupported(deviceLanguage) ? deviceLanguage : FALLBACK_LANGUAGE;
}

export const i18n = createInstance();

// Synchronous init: resources are bundled, so the first render already has strings.
void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, id: { translation: id } },
  lng: detectLanguage(),
  fallbackLng: FALLBACK_LANGUAGE,
  interpolation: { escapeValue: false }, // React already escapes output.
  initAsync: false,
});
