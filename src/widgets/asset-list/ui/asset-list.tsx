import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useBalanceStore } from '@/entities/account';
import { ASSET_REGISTRY, getAssetKey, type Asset } from '@/entities/asset';
import { AMOUNT_DISPLAY_FRACTION_DIGITS } from '@/shared/config';
import { formatAmount } from '@/shared/lib';
import { Card, Skeleton, Text } from '@/shared/ui';

function AssetRow({ asset }: { asset: Asset }) {
  const { t, i18n } = useTranslation();
  const nativeWei = useBalanceStore((state) => state.wei);
  // Only the native balance exists so far; ERC-20 balances arrive with token support.
  const wei = asset.kind === 'native' ? nativeWei : null;
  const name = asset.kind === 'native' ? t('home.assets.nativeName') : asset.symbol;

  return (
    <View className="flex-row items-center justify-between py-2">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-50">
          <Text variant="label" tone="primary">
            {asset.symbol.slice(0, 1)}
          </Text>
        </View>
        <View>
          <Text variant="label">{name}</Text>
          <Text variant="caption" tone="secondary">
            {asset.symbol}
          </Text>
        </View>
      </View>
      {wei === null ? (
        <Skeleton className="h-5 w-20 rounded-md" />
      ) : (
        <Text variant="label">
          {formatAmount(wei, asset.decimals, {
            locale: i18n.language,
            maxFractionDigits: AMOUNT_DISPLAY_FRACTION_DIGITS,
          })}
        </Text>
      )}
    </View>
  );
}

export function AssetList({ enterIndex = 0 }: { enterIndex?: number }) {
  const { t } = useTranslation();
  return (
    <Card enterIndex={enterIndex} className="gap-2">
      <Text variant="heading" accessibilityRole="header">
        {t('home.assets.title')}
      </Text>
      {ASSET_REGISTRY.map((asset) => (
        <AssetRow key={getAssetKey(asset)} asset={asset} />
      ))}
    </Card>
  );
}
