import { router } from 'expo-router';
import EyeOff from 'lucide-react-native/icons/eye-off';
import Info from 'lucide-react-native/icons/info';
import Languages from 'lucide-react-native/icons/languages';
import Lock from 'lucide-react-native/icons/lock';
import Palette from 'lucide-react-native/icons/palette';
import Server from 'lucide-react-native/icons/server';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import Star from 'lucide-react-native/icons/star';
import Trash2 from 'lucide-react-native/icons/trash-2';
import WalletCards from 'lucide-react-native/icons/wallet-cards';
import { useTranslation } from 'react-i18next';

import { useAuthPrefsStore } from '@/entities/auth';
import { useActiveRpcUrl } from '@/entities/network';
import { useAccountLabel, useDefaultAccount } from '@/entities/wallet';
import { LANGUAGE_NAMES, useCurrentLanguage } from '@/features/change-language';
import { lockNow } from '@/features/lock-settings';
import { switchToDefaultAccount } from '@/features/manage-accounts';
import { getAppInfo, ROUTES, type AppRoute } from '@/shared/config';
import { formatUrlHost, isErrorReportingAvailable } from '@/shared/lib';
import { useAppearanceStore, useErrorReportingStore } from '@/shared/model';
import { ScrollScreen, SettingsRow, SettingsSection, Text } from '@/shared/ui';

const MINUTE_MS = 60_000;

function useAutoLockLabel(): string {
  const { t } = useTranslation();
  const autoLockMs = useAuthPrefsStore((state) => state.autoLockMs);
  return autoLockMs === 0
    ? t('settings.security.immediately')
    : t('settings.security.minutes', { count: autoLockMs / MINUTE_MS });
}

function usePrivacyLabel(): string {
  const { t } = useTranslation();
  const isEnabled = useErrorReportingStore((state) => state.isEnabled);
  if (!isErrorReportingAvailable()) return t('settings.privacy.notSetUp');
  return t(isEnabled ? 'settings.privacy.on' : 'settings.privacy.off');
}

/**
 * Security and "Remove wallet" act on one wallet. From Settings that is the default account's,
 * not the one last looked at (D-92); both screens name it.
 */
function openForDefaultAccount(route: AppRoute) {
  switchToDefaultAccount();
  router.push(route);
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
  const defaultAccount = useDefaultAccount();
  const rpcUrl = useActiveRpcUrl();
  const autoLock = useAutoLockLabel();
  const privacy = usePrivacyLabel();
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
          icon={WalletCards}
          title={t('settings.accounts.title')}
          onPress={() => router.navigate(ROUTES.wallets)}
        />
        <SettingsRow
          icon={Star}
          title={t('settings.defaultAccount.title')}
          value={defaultAccount ? label(defaultAccount) : undefined}
          onPress={() => router.push(ROUTES.defaultAccount)}
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
          onPress={() => openForDefaultAccount(ROUTES.security)}
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
          onPress={() => openForDefaultAccount(ROUTES.removeWallet)}
          isDestructive
        />
      </SettingsSection>
      <SettingsSection title={t('settings.groups.app')}>
        <SettingsRow
          icon={EyeOff}
          title={t('settings.privacy.title')}
          value={privacy}
          onPress={() => router.push(ROUTES.privacy)}
        />
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
