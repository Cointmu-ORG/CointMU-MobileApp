import Palette from 'lucide-react-native/icons/palette';
import QrCode from 'lucide-react-native/icons/qr-code';
import Star from 'lucide-react-native/icons/star';
import Trash2 from 'lucide-react-native/icons/trash-2';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { isWalletUsable, useAccountLabel, useWalletLabel, useWalletStore } from '@/entities/wallet';
import { shortenAddress } from '@/shared/lib';
import { ListRow, ListSection, Text } from '@/shared/ui';

import { setDefaultAccount, type AccountRef } from '../model/accounts';

type AccountMenuProps = {
  account: AccountRef;
  /** Opens the page for this card's name, color and icon. */
  onPersonalize: () => void;
  /** Opens the receive screen for this account. */
  onReceive: () => void;
  /** Called after "Set as default": the sheet closes. */
  onDefaultSet: () => void;
  /** Starts removing the account's wallet. Offered when the card is all the wallet has. */
  onRemoveWallet: () => void;
};

/**
 * The "…" menu of an account card: a short list of actions and nothing else, so it fits the
 * sheet without dragging. "Set as default" is offered on every account but the default (D-92).
 * A wallet with several accounts is removed from its own page, where it
 * is clear that all of them go.
 */
export function AccountMenu({ account: ref, ...actions }: AccountMenuProps) {
  const { t } = useTranslation();
  const accountLabel = useAccountLabel();
  const walletLabel = useWalletLabel();
  const wallet = useWalletStore(
    (state) => state.wallets.find((candidate) => candidate.id === ref.walletId) ?? null,
  );
  const account = wallet?.accounts.find((candidate) => candidate.index === ref.index);
  const isDefault = useWalletStore(
    (state) =>
      state.defaultAccount?.walletId === ref.walletId && state.defaultAccount.index === ref.index,
  );
  if (wallet === null || account === undefined) return null;

  return (
    <View className="gap-4">
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
      <ListSection>
        <ListRow
          icon={Palette}
          title={t('wallets.menu.personalize')}
          onPress={actions.onPersonalize}
        />
        {isDefault || !isWalletUsable(wallet) ? null : (
          <ListRow
            icon={Star}
            title={t('wallets.menu.setDefault')}
            onPress={() => {
              setDefaultAccount(ref);
              actions.onDefaultSet();
            }}
          />
        )}
        <ListRow icon={QrCode} title={t('wallets.menu.receive')} onPress={actions.onReceive} />
        {wallet.accounts.length === 1 ? (
          <ListRow
            icon={Trash2}
            title={t('settings.logout.remove')}
            onPress={actions.onRemoveWallet}
            isDestructive
          />
        ) : null}
      </ListSection>
    </View>
  );
}
