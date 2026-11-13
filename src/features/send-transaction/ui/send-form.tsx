import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { getAssetKey } from '@/entities/asset';
import { ROUTES } from '@/shared/config';
import { Button, Notice } from '@/shared/ui';

import { AmountField } from './amount-field';
import { AssetPicker } from './asset-picker';
import { RecipientField } from './recipient-field';
import { SourceField } from './source-field';
import { useSendForm } from './use-send-form';

/** Step 1 of Send: the source account, asset, recipient and amount. "Review" estimates the fee first. */
export function SendForm() {
  const { t } = useTranslation();
  const form = useSendForm();
  return (
    <View className="gap-6">
      {form.source ? (
        <SourceField account={form.source} onPress={() => router.push(ROUTES.accountSwitcher)} />
      ) : null}
      <AssetPicker selectedKey={getAssetKey(form.asset)} onSelect={form.selectAsset} />
      <RecipientField
        value={form.toInput}
        error={form.errors.to}
        onChange={form.setToInput}
        onScan={() => router.push({ pathname: ROUTES.scan, params: { from: 'send' } })}
      />
      <AmountField
        asset={form.asset}
        value={form.amountInput}
        error={form.errors.amount}
        balance={form.balance}
        isMaxLoading={form.isMaxLoading}
        onChange={form.setAmountInput}
        onMax={form.fillMax}
      />
      {form.errors.form ? <Notice tone="danger">{form.errors.form}</Notice> : null}
      <Button label={t('send.form.continue')} onPress={form.submit} isLoading={form.isSubmitting} />
    </View>
  );
}
