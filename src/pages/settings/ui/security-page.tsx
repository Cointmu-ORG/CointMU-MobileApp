import { router } from 'expo-router';
import KeyRound from 'lucide-react-native/icons/key-round';
import KeySquare from 'lucide-react-native/icons/key-square';
import Lock from 'lucide-react-native/icons/lock';
import ScrollText from 'lucide-react-native/icons/scroll-text';
import Trash2 from 'lucide-react-native/icons/trash-2';
import { useTranslation } from 'react-i18next';

import { useWalletStore } from '@/entities/wallet';
import {
  AutoLockPicker,
  BiometricsOffNotice,
  BiometricsRow,
  LockoutInfo,
  lockNow,
} from '@/features/lock-settings';
import { ROUTES } from '@/shared/config';
import { FormScreen, SettingsRow, SettingsSection } from '@/shared/ui';

/**
 * Settings > Security: everything that guards the wallet in one place. Access (PIN, biometrics,
 * auto-lock, lock now), backups (recovery phrase, private key), the wrong-PIN counter, and
 * removing the wallet.
 */
export function SecurityPage() {
  const { t } = useTranslation();
  const source = useWalletStore((state) => state.source);
  const isImportedKey = source === 'private-key';

  return (
    <FormScreen>
      <BiometricsOffNotice />
      <SettingsSection title={t('settings.security.access')}>
        <SettingsRow
          icon={KeyRound}
          title={t('settings.security.changePin')}
          onPress={() => router.push(ROUTES.changePin)}
        />
        <BiometricsRow onEnableRequested={() => router.push(ROUTES.enableBiometrics)} />
        <AutoLockPicker />
        <SettingsRow
          icon={Lock}
          title={t('settings.logout.lockNow')}
          description={t('settings.logout.lockNowDesc')}
          onPress={lockNow}
        />
      </SettingsSection>
      <SettingsSection
        title={t('settings.security.backup')}
        footer={t('settings.security.backupFooter')}
      >
        <SettingsRow
          icon={ScrollText}
          title={t('settings.security.recoveryPhraseTitle')}
          description={t(
            isImportedKey
              ? 'settings.security.recoveryPhraseNone'
              : 'settings.security.recoveryPhraseDesc',
          )}
          onPress={() => router.push(ROUTES.recoveryPhrase)}
        />
        <SettingsRow
          icon={KeySquare}
          title={t('settings.security.privateKeyTitle')}
          description={t(
            isImportedKey
              ? 'settings.security.privateKeyOnlyBackup'
              : 'settings.security.privateKeyDesc',
          )}
          onPress={() => router.push(ROUTES.privateKey)}
        />
      </SettingsSection>
      <SettingsSection title={t('settings.security.lockout')}>
        <LockoutInfo />
      </SettingsSection>
      <SettingsSection title={t('settings.security.danger')}>
        <SettingsRow
          icon={Trash2}
          title={t('settings.logout.remove')}
          description={t('settings.logout.removeDesc')}
          onPress={() => router.push(ROUTES.removeWallet)}
          isDestructive
        />
      </SettingsSection>
    </FormScreen>
  );
}
