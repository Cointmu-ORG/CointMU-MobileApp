import { useTranslation } from 'react-i18next';

import { FALLBACK_LANGUAGE, SUPPORTED_LANGUAGES, type Language } from '@/shared/config';
import { isSupportedLanguage, setLanguage } from '@/shared/i18n';
import { logger } from '@/shared/lib';
import { SegmentedControl } from '@/shared/ui';

// Each language is named in itself, so it can be found whatever the current language is.
const LANGUAGE_NAMES: Record<Language, string> = { en: 'English', id: 'Bahasa Indonesia' };

export function LanguagePicker() {
  const { t, i18n } = useTranslation();
  const current = isSupportedLanguage(i18n.language) ? i18n.language : FALLBACK_LANGUAGE;
  return (
    <SegmentedControl
      accessibilityLabel={t('settings.general.language')}
      options={SUPPORTED_LANGUAGES.map((language) => ({
        value: language,
        label: LANGUAGE_NAMES[language],
      }))}
      value={current}
      onChange={(language) => {
        setLanguage(language).catch((error: unknown) =>
          logger.warn('Saving the language failed', { error, language }),
        );
      }}
    />
  );
}
