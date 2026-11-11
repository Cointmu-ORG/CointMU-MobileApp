import { router } from 'expo-router';
import Info from 'lucide-react-native/icons/info';
import Languages from 'lucide-react-native/icons/languages';
import Lock from 'lucide-react-native/icons/lock';
import Palette from 'lucide-react-native/icons/palette';
import Server from 'lucide-react-native/icons/server';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import Trash2 from 'lucide-react-native/icons/trash-2';
import Users from 'lucide-react-native/icons/users';
import { useTranslation } from 'react-i18next';

import { useAuthPrefsStore } from '@/entities/auth';
import { useActiveRpcUrl } from '@/entities/network';
import { useAccountLabel, useActiveAccount } from '@/entities/wallet';
import { LANGUAGE_NAMES, useCurrentLanguage } from '@/features/change-language';
import { lockNow } from '@/features/lock-settings';
import { getAppInfo, ROUTES } from '@/shared/config';
import { formatUrlHost } from '@/shared/lib';
import { useAppearanceStore } from '@/shared/model';
import { ScrollScreen, SettingsRow, SettingsSection, Text } from '@/shared/ui';

const MINUTE_MS = 60_000;

function useAutoLockLabel(): string {
  const { t } = useTranslation();
  const autoLockMs = useAuthPrefsStore((state) => state.autoLockMs);
  return autoLockMs === 0
    ? t('settings.security.immediately')
    : t('settings.security.minutes', { count: autoLockMs / MINUTE_MS });
}

/**
 * The Settings tab: one row per group, each showing its current value and opening its own
 * screen. Same groups as the desktop settings, minus the desktop-only ones (D-46, D-71).
 */
export function SettingsPage() {
  const { t } = useTranslation();
  const theme = useAppearanceStore((state) => state.theme);
  const language = useCurrentLanguage();
  const label = useAccountLabel();
  const account = useActiveAccount();
  const rpcUrl = useActiveRpcUrl();
  const autoLock = useAutoLockLabel();
  const { version } = getAppInfo();

  return (
    <ScrollScreen>
      <Text variant="title" accessibilityRole="header">
        {t('settings.title')}
      </Text>
      <SettingsSection title={t('settings.groups.general')}>
        <SettingsRow
          icon={Palette}
          title={t('settings.appearance.title')}
          value={t(`settings.appearance.themes.${theme}`)}
          onPress={() => router.push(ROUTES.appearance)}
        />
        <SettingsRow
          icon={Languages}
          title={t('settings.language.title')}
          value={LANGUAGE_NAMES[language]}
          onPress={() => router.push(ROUTES.language)}
        />
      </SettingsSection>
      <SettingsSection title={t('settings.groups.wallet')}>
        <SettingsRow
          icon={Users}
          title={t('settings.accounts.title')}
          value={account ? label(account) : undefined}
          onPress={() => router.push(ROUTES.accounts)}
        />
        <SettingsRow
          icon={Server}
          title={t('settings.network.title')}
          value={formatUrlHost(rpcUrl)}
          onPress={() => router.push(ROUTES.network)}
        />
        <SettingsRow
          icon={ShieldCheck}
          title={t('settings.security.title')}
          value={t('settings.security.autoLockValue', { time: autoLock })}
          onPress={() => router.push(ROUTES.security)}
        />
      </SettingsSection>
      <SettingsSection title={t('settings.logout.title')}>
        <SettingsRow
          icon={Lock}
          title={t('settings.logout.lockNow')}
          description={t('settings.logout.lockNowDesc')}
          onPress={lockNow}
        />
        <SettingsRow
          icon={Trash2}
          title={t('settings.logout.remove')}
          description={t('settings.logout.removeDesc')}
          onPress={() => router.push(ROUTES.removeWallet)}
          isDestructive
        />
      </SettingsSection>
      <SettingsSection>
        <SettingsRow
          icon={Info}
          title={t('settings.about.title')}
          value={t('settings.about.versionShort', { version })}
          onPress={() => router.push(ROUTES.about)}
        />
      </SettingsSection>
    </ScrollScreen>
  );
}
