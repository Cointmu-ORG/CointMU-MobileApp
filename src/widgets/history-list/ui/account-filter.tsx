import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { AccountBadge, useAccountLabel, useUsableAccounts } from '@/entities/wallet';
import { isSameAddress } from '@/shared/lib';
import { PressableSurface, Text, type SurfacePalette } from '@/shared/ui';

type AccountFilterProps = {
  /** Address of the account shown, or null for all accounts. */
  value: string | null;
  onChange: (address: string | null) => void;
};

// Selected is a border and a tint plus the checked state, never color alone. Both states keep
// the same class families, so a chip is not remounted when it becomes selected (D-63).
const CHIP_PALETTE = {
  selected: {
    idle: 'border-2 border-accent bg-primary-50',
    hovered: 'border-2 border-accent bg-primary-50',
    pressed: 'border-2 border-accent bg-primary-100',
  },
  unselected: {
    idle: 'border-2 border-border bg-surface-card',
    hovered: 'border-2 border-border bg-surface',
    pressed: 'border-2 border-border bg-surface-muted',
  },
} as const satisfies Record<string, SurfacePalette>;
const BADGE_SIZE = 22;

/** "All" and one chip per usable account, in one row that scrolls sideways. */
export function AccountFilter({ value, onChange }: AccountFilterProps) {
  const { t } = useTranslation();
  const labelOf = useAccountLabel();
  const accounts = useUsableAccounts();
  if (accounts.length < 2) return null;
  const chips = [
    { key: 'all', address: null, label: t('history.filter.all'), account: null },
    ...accounts.map((account) => ({
      key: account.address,
      address: account.address,
      label: labelOf(account),
      account,
    })),
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Bleeds to the screen edges so a cut-off chip shows there is more to the side.
      className="-mx-6"
      contentContainerClassName="px-6"
      accessibilityRole="radiogroup"
      accessibilityLabel={t('history.filter.label')}
    >
      <View className="flex-row gap-2">
        {chips.map(({ key, address, label, account }) => {
          const isSelected =
            address === null ? value === null : value !== null && isSameAddress(address, value);
          return (
            <PressableSurface
              key={key}
              palette={isSelected ? CHIP_PALETTE.selected : CHIP_PALETTE.unselected}
              className="min-h-11 flex-row items-center gap-2 rounded-full px-3"
              onPress={() => onChange(address)}
              accessibilityRole="radio"
              accessibilityLabel={label}
              accessibilityState={{ selected: isSelected, checked: isSelected }}
            >
              {account ? <AccountBadge account={account} size={BADGE_SIZE} /> : null}
              <Text variant="label" tone={isSelected ? 'primary' : 'default'} numberOfLines={1}>
                {label}
              </Text>
            </PressableSurface>
          );
        })}
      </View>
    </ScrollView>
  );
}
