import { useTranslation } from 'react-i18next';

import { ScrollScreen, Text } from '@/shared/ui';

import { AboutSection } from './about-section';
import { GeneralSection } from './general-section';
import { LogoutSection } from './logout-section';
import { SecuritySection } from './security-section';
import { WalletSections } from './wallet-sections';

/** Mirrors the desktop order (General, Network, Security, About) minus mining (PR notes). */
export function SettingsPage() {
  const { t } = useTranslation();
  return (
    <ScrollScreen>
      <Text variant="title" accessibilityRole="header">
        {t('settings.title')}
      </Text>
      <GeneralSection />
      <WalletSections />
      <SecuritySection />
      <LogoutSection />
      <AboutSection />
    </ScrollScreen>
  );
}
