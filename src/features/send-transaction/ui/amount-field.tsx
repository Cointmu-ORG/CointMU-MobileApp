import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { Asset } from '@/entities/asset';
import { AMOUNT_DISPLAY_FRACTION_DIGITS } from '@/shared/config';
import { formatAmount } from '@/shared/lib';
import { Button, Input, Text } from '@/shared/ui';

type AmountFieldProps = {
  asset: Asset;
  value: string;
  error: string | null;
  balance: bigint | null;
  isMaxLoading: boolean;
  onChange: (value: string) => void;
  onMax: () => void;
};

/** Locale-aware amount input with the available balance and "Max". */
export function AmountField(props: AmountFieldProps) {
  const { asset, value, error, balance, isMaxLoading, onChange, onMax } = props;
  const { t, i18n } = useTranslation();
  const available =
    balance === null
      ? t('send.form.balanceLoading')
      : t('send.form.available', {
          amount: formatAmount(balance, asset.decimals, {
            locale: i18n.language,
            maxFractionDigits: AMOUNT_DISPLAY_FRACTION_DIGITS,
          }),
          symbol: asset.symbol,
        });

  return (
    <View className="gap-2">
      <Input
        label={t('send.form.amount', { symbol: asset.symbol })}
        placeholder="0"
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        inputMode="decimal"
        status={error ? 'error' : 'default'}
        message={error ?? undefined}
      />
      <View className="flex-row items-center justify-between gap-3">
        <Text variant="caption" tone="secondary" className="flex-1">
          {available}
        </Text>
        <Button
          variant="secondary"
          label={t('send.form.max')}
          onPress={onMax}
          isLoading={isMaxLoading}
          isDisabled={balance === null}
          accessibilityHint={t('send.form.maxHint')}
        />
      </View>
    </View>
  );
}
