import { useTranslation } from 'react-i18next';

import { FALLBACK_LANGUAGE, SUPPORTED_LANGUAGES, type Language } from '@/shared/config';
import { isSupportedLanguage, setLanguage } from '@/shared/i18n';
import { logger } from '@/shared/lib';
import { ListRow, ListSection, RadioMark } from '@/shared/ui';

// Each language is named in itself, so it can be found whatever the current language is.
export const LANGUAGE_NAMES: Record<Language, string> = { en: 'English', id: 'Bahasa Indonesia' };

/** The language Muvo is shown in right now. */
export function useCurrentLanguage(): Language {
  const { i18n } = useTranslation();
  return isSupportedLanguage(i18n.language) ? i18n.language : FALLBACK_LANGUAGE;
}

/** One row per language. The choice applies at once and is restored on the next start. */
export function LanguagePicker() {
  const { t } = useTranslation();
  const current = useCurrentLanguage();
  return (
    <ListSection footer={t('settings.language.footer')}>
      {SUPPORTED_LANGUAGES.map((language) => (
        <ListRow
          key={language}
          title={LANGUAGE_NAMES[language]}
          leading={<RadioMark isSelected={language === current} />}
          trailing={null}
          onPress={() => {
            setLanguage(language).catch((error: unknown) =>
              logger.warn('Saving the language failed', { error, language }),
            );
          }}
          accessibilityRole="radio"
          accessibilityState={{ checked: language === current }}
        />
      ))}
    </ListSection>
  );
}
