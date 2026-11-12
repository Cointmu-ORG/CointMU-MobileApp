import CircleCheck from 'lucide-react-native/icons/circle-check';
import QrCode from 'lucide-react-native/icons/qr-code';
import Shapes from 'lucide-react-native/icons/shapes';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  isWalletUsable,
  useAccountIconLabel,
  useAccountLabel,
  useActiveAccount,
  useWalletLabel,
  useWalletStore,
} from '@/entities/wallet';
import { shortenAddress } from '@/shared/lib';
import { Button, Input, ListRow, ListSection, Text } from '@/shared/ui';

import {
  MAX_NAME_LENGTH,
  renameAccount,
  setAccountColor,
  switchToAccount,
  type AccountRef,
} from '../model/accounts';
import { ColorSwatches } from './color-swatches';

type AccountMenuProps = {
  account: AccountRef;
  /** Called after "Set as active": the sheet closes. */
  onDone: () => void;
  /** Opens the icon picker for this account. */
  onChangeIcon: () => void;
  /** Opens the receive screen for this account. */
  onReceive: () => void;
};

/**
 * The "…" menu of an account card: rename, change color and icon, set active, show the receive QR. Name
 * and color are local and public; nothing here reads a secret.
 */
export function AccountMenu({ account: ref, onDone, onChangeIcon, onReceive }: AccountMenuProps) {
  const { t } = useTranslation();
  const accountLabel = useAccountLabel();
  const walletLabel = useWalletLabel();
  const iconLabel = useAccountIconLabel();
  const wallet = useWalletStore(
    (state) => state.wallets.find((candidate) => candidate.id === ref.walletId) ?? null,
  );
  const account = wallet?.accounts.find((candidate) => candidate.index === ref.index);
  const active = useActiveAccount();
  const [name, setName] = useState(account?.name ?? '');
  const [isSaved, setIsSaved] = useState(false);
  if (wallet === null || account === undefined) return null;

  const isActive = active?.walletId === wallet.id && active.index === account.index;
  const save = () => {
    renameAccount(ref, name);
    setIsSaved(true);
  };

  return (
    <View className="gap-5">
      <View className="gap-1">
        <Text variant="heading" accessibilityRole="header">
          {accountLabel(account)}
        </Text>
        <Text variant="caption" tone="secondary">
          {t('wallets.menu.subtitle', {
            wallet: walletLabel(wallet),
            address: shortenAddress(account.address),
          })}
        </Text>
      </View>
      <View className="gap-3">
        <Input
          label={t('wallets.menu.name')}
          placeholder={t('accounts.defaultName', { number: account.index + 1 })}
          value={name}
          onChangeText={(text) => {
            setName(text);
            setIsSaved(false);
          }}
          maxLength={MAX_NAME_LENGTH}
          returnKeyType="done"
          onSubmitEditing={save}
          status={isSaved ? 'success' : 'default'}
          message={isSaved ? t('wallets.menu.nameSaved') : t('wallets.menu.nameHint')}
        />
        <Button
          label={t('wallets.menu.saveName')}
          variant="secondary"
          onPress={save}
          isDisabled={name.trim() === (account.name ?? '')}
        />
      </View>
      <ColorSwatches
        label={t('wallets.menu.color')}
        value={account.color}
        onChange={(color) => setAccountColor(ref, color)}
      />
      <ListSection>
        <ListRow
          icon={Shapes}
          title={t('wallets.menu.icon')}
          value={iconLabel(account.icon)}
          onPress={onChangeIcon}
        />
      </ListSection>
      <ListSection>
        <ListRow
          icon={CircleCheck}
          title={t(isActive ? 'wallets.menu.isActive' : 'wallets.menu.setActive')}
          onPress={() => {
            switchToAccount(ref);
            onDone();
          }}
          isDisabled={isActive || !isWalletUsable(wallet)}
        />
        <ListRow icon={QrCode} title={t('wallets.menu.receive')} onPress={onReceive} />
      </ListSection>
    </View>
  );
}
