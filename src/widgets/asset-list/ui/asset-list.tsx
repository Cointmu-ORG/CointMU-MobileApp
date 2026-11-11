import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useBalanceStore } from '@/entities/account';
import { getAssetKey, useTokenBalanceStore, useVisibleAssets, type Asset } from '@/entities/asset';
import { ROUTES } from '@/shared/config';
import { useAmountDisplay, useAppearanceStore } from '@/shared/model';
import { Button, Card, Skeleton, Text } from '@/shared/ui';

function useAssetBalance(asset: Asset): bigint | null {
  const nativeWei = useBalanceStore((state) => state.wei);
  const tokenBalance = useTokenBalanceStore((state) => state.balances[getAssetKey(asset)]);
  return asset.kind === 'native' ? nativeWei : (tokenBalance ?? null);
}

function AssetRow({ asset }: { asset: Asset }) {
  const { t } = useTranslation();
  const { formatBalance } = useAmountDisplay();
  const hidesZeroBalanceTokens = useAppearanceStore((state) => state.hidesZeroBalanceTokens);
  const balance = useAssetBalance(asset);
  const name = asset.kind === 'native' ? t('home.assets.nativeName') : (asset.name ?? asset.symbol);
  const isUnverified = asset.kind === 'erc20' && asset.source === 'custom';
  // Settings > Appearance: a token with nothing in it stays off the home list. CMU always shows.
  if (hidesZeroBalanceTokens && asset.kind === 'erc20' && balance === 0n) return null;

  return (
    <View className="flex-row items-center justify-between gap-3 py-2">
      <View className="flex-1 flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-50">
          <Text variant="label" tone="primary">
            {asset.symbol.slice(0, 1)}
          </Text>
        </View>
        <View className="flex-1">
          <Text variant="label" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="caption" tone={isUnverified ? 'warning' : 'secondary'}>
            {isUnverified ? `${asset.symbol} · ${t('tokens.unverified')}` : asset.symbol}
          </Text>
        </View>
      </View>
      {balance === null ? (
        <Skeleton className="h-5 w-20 rounded-md" />
      ) : (
        <Text variant="label">{formatBalance(balance, asset.decimals)}</Text>
      )}
    </View>
  );
}

export function AssetList({ enterIndex = 0 }: { enterIndex?: number }) {
  const { t } = useTranslation();
  const assets = useVisibleAssets();
  return (
    <Card enterIndex={enterIndex} className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text variant="heading" accessibilityRole="header">
          {t('home.assets.title')}
        </Text>
        <Button
          variant="ghost"
          label={t('tokens.manage')}
          onPress={() => router.push(ROUTES.tokens)}
        />
      </View>
      {assets.map((asset) => (
        <AssetRow key={getAssetKey(asset)} asset={asset} />
      ))}
    </Card>
  );
}
