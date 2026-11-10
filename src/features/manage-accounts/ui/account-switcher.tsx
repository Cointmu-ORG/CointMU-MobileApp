import Check from 'lucide-react-native/icons/check';
import Plus from 'lucide-react-native/icons/plus';
import Settings from 'lucide-react-native/icons/settings';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useBalanceStore } from '@/entities/account';
import { NATIVE_ASSET } from '@/entities/asset';
import { useAccountLabel, useActiveAccount, useWalletStore } from '@/entities/wallet';
import { AMOUNT_DISPLAY_FRACTION_DIGITS } from '@/shared/config';
import { formatAmount, shortenAddress } from '@/shared/lib';
import { colors, ICON_SIZE, ListRow, ListSection, Text } from '@/shared/ui';

import { switchToAccount } from '../model/accounts';
import { useAddAccount } from './use-add-account';

type AccountSwitcherProps = {
  /** Called after a switch or a successful add: the sheet closes. */
  onDone: () => void;
  /** Opens the full accounts page (rename). */
  onManage: () => void;
};

/** Only the active account's balance is ever loaded; other rows show none. */
function useActiveBalanceText(): string | undefined {
  const { i18n } = useTranslation();
  const wei = useBalanceStore((state) => state.wei);
  if (wei === null) return undefined;
  const amount = formatAmount(wei, NATIVE_ASSET.decimals, {
    locale: i18n.language,
    maxFractionDigits: AMOUNT_DISPLAY_FRACTION_DIGITS,
  });
  return `${amount} ${NATIVE_ASSET.symbol}`;
}

/** Quick account switcher for the home sheet: pick an account, add one, or open Manage. */
export function AccountSwitcher({ onDone, onManage }: AccountSwitcherProps) {
  const { t } = useTranslation();
  const label = useAccountLabel();
  const accounts = useWalletStore((state) => state.accounts);
  const canAdd = useWalletStore((state) => state.source) === 'mnemonic';
  const active = useActiveAccount();
  const activeBalance = useActiveBalanceText();
  const { add, isAdding, hasFailed } = useAddAccount();

  const pick = (index: number) => {
    switchToAccount(index);
    onDone();
  };
  const addAndClose = async () => {
    if (await add()) onDone();
  };

  return (
    <View className="gap-4">
      <Text variant="heading" accessibilityRole="header">
        {t('accounts.switcher.title')}
      </Text>
      <ListSection>
        {accounts.map((account) => {
          const isActive = account.index === active?.index;
          return (
            <ListRow
              key={account.index}
              title={label(account)}
              description={shortenAddress(account.address)}
              value={isActive ? activeBalance : undefined}
              trailing={
                isActive ? (
                  <Check size={ICON_SIZE.md} color={colors.primary[600]} />
                ) : (
                  <View className="w-5" />
                )
              }
              onPress={() => pick(account.index)}
              accessibilityRole="radio"
              accessibilityState={{ checked: isActive }}
            />
          );
        })}
      </ListSection>
      <ListSection>
        <ListRow
          title={t('settings.accounts.add')}
          icon={Plus}
          trailing={<View className="w-5" />}
          onPress={() => void addAndClose()}
          isDisabled={!canAdd || isAdding}
        />
        <ListRow
          title={t('accounts.switcher.manage')}
          description={t('accounts.switcher.manageHint')}
          icon={Settings}
          onPress={onManage}
        />
      </ListSection>
      {hasFailed || !canAdd ? (
        <Text
          variant="caption"
          tone={hasFailed ? 'danger' : 'secondary'}
          accessibilityLiveRegion="polite"
        >
          {t(hasFailed ? 'settings.accounts.addFailed' : 'settings.accounts.privateKeyHint')}
        </Text>
      ) : null}
    </View>
  );
}
