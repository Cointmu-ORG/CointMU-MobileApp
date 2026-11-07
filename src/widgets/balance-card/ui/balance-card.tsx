import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useBalanceStore } from '@/entities/account';
import { NATIVE_ASSET } from '@/entities/asset';
import { useWalletStore } from '@/entities/wallet';
import { AMOUNT_DISPLAY_FRACTION_DIGITS } from '@/shared/config';
import { formatAmount } from '@/shared/lib';
import { Button, Card, MOTION, Skeleton, Text } from '@/shared/ui';

import { useBalancePolling } from '../model/use-balance-polling';
import { AccountChip } from './account-chip';
import { CopyAddress } from './copy-address';

function BalanceValue({ wei }: { wei: bigint }) {
  const { i18n } = useTranslation();
  const formatted = formatAmount(wei, NATIVE_ASSET.decimals, {
    locale: i18n.language,
    maxFractionDigits: AMOUNT_DISPLAY_FRACTION_DIGITS,
  });
  // Keyed by the formatted string: a new value fades in. Numbers are never tweened through floats.
  return (
    <Animated.View key={formatted} entering={FadeIn.duration(MOTION.slowMs)}>
      <View className="flex-row items-baseline gap-2">
        <Text variant="amount" accessibilityLiveRegion="polite">
          {formatted}
        </Text>
        <Text variant="heading" tone="secondary">
          {NATIVE_ASSET.symbol}
        </Text>
      </View>
    </Animated.View>
  );
}

export function BalanceCard({ enterIndex = 0 }: { enterIndex?: number }) {
  const { t } = useTranslation();
  const address = useWalletStore((state) => state.address);
  const wei = useBalanceStore((state) => state.wei);
  const status = useBalanceStore((state) => state.status);
  useBalancePolling(address);

  const isUnreachable = status === 'error';
  return (
    <Card enterIndex={enterIndex} className="gap-4">
      <View className="gap-1">
        <AccountChip />
        <Text variant="label" tone="secondary">
          {t('home.balance.label')}
        </Text>
      </View>
      {wei !== null ? <BalanceValue wei={wei} /> : null}
      {wei === null && !isUnreachable ? <Skeleton className="h-10 w-48 rounded-lg" /> : null}
      {isUnreachable ? (
        <View className="gap-3">
          <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
            {t('home.balance.error')}
          </Text>
          {address ? (
            <Button
              label={t('home.balance.retry')}
              variant="secondary"
              onPress={() => void useBalanceStore.getState().refresh(address)}
            />
          ) : null}
        </View>
      ) : null}
      {address ? <CopyAddress address={address} /> : null}
    </Card>
  );
}
