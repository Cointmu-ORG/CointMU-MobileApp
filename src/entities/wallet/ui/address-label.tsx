import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { shortenAddress } from '@/shared/lib';
import { CopyValue, Text } from '@/shared/ui';

import { useAccountByAddress, useAccountLabel } from '../model/selectors';
import { AccountBadge } from './account-icon';

const BADGE_SIZE = 24;

type AddressLabelProps = {
  address: string;
  /** What the address is, e.g. "To"; read before it by screen readers. */
  label: string;
};

/**
 * An address the way a person reads it: an own account by its icon and name (with the short
 * address under it), anyone else by the short address. A tap copies the full address.
 */
export function AddressLabel({ address, label }: AddressLabelProps) {
  const { t } = useTranslation();
  const account = useAccountByAddress(address);
  const labelOf = useAccountLabel();
  const short = shortenAddress(address);
  const name = account ? labelOf(account) : null;
  return (
    <CopyValue
      value={address}
      accessibilityLabel={t('common.labelled', {
        label,
        value: name ? `${name}, ${short}` : short,
      })}
    >
      {account && name ? (
        <View className="shrink flex-row items-center gap-2">
          <AccountBadge account={account} size={BADGE_SIZE} />
          <View className="shrink items-end">
            <Text variant="label" numberOfLines={1}>
              {name}
            </Text>
            <Text variant="caption" tone="secondary">
              {short}
            </Text>
          </View>
        </View>
      ) : (
        <Text variant="mono">{short}</Text>
      )}
    </CopyValue>
  );
}
