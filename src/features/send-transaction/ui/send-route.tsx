import Coins from 'lucide-react-native/icons/coins';
import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useAccountLabel, useActiveAccount } from '@/entities/wallet';
import { formatAmount, shortenAddress } from '@/shared/lib';
import { ICON_SIZE, Text, useCardFill, useThemeColors } from '@/shared/ui';

import type { SendDraft } from '../model/send-flow-store';

const COIN_SIZE = 40;
const TRACK_HEIGHT = 72;
const TRACK_WIDTH = 2;
/** The coin starts on the sender's edge and ends on the recipient's. */
const COIN_TRAVEL = TRACK_HEIGHT;
const COIN_TRAVEL_MS = 900;
const DOT_SIZE = 12;

type SendRouteProps = {
  draft: SendDraft;
  /** 0 = with the sender, 1 = with the recipient (see `coinPosition`). */
  coinAt: number;
};

function Party({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="gap-1 rounded-card border border-border bg-surface-card p-4">
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
      {children}
    </View>
  );
}

/**
 * The transfer as a route: the sending account, a track and the recipient, with a coin that
 * moves along the track when its position changes (Reanimated only). It moves once, when the
 * node accepts the transaction. Under reduce motion the coin is simply drawn where it belongs.
 */
export function SendRoute({ draft, coinAt }: SendRouteProps) {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();
  const account = useActiveAccount();
  const accountLabel = useAccountLabel();
  const fillOf = useCardFill();
  const position = useSharedValue(coinAt);
  const coinStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: position.get() * COIN_TRAVEL }],
  }));

  useEffect(() => {
    position.set(
      withTiming(coinAt, { duration: COIN_TRAVEL_MS, easing: Easing.inOut(Easing.cubic) }),
    );
  }, [coinAt, position]);

  // The exact amount, as on the review: nothing rounded or hidden in the send flow.
  const amount = formatAmount(draft.amount, draft.asset.decimals, {
    locale: i18n.language,
    maxFractionDigits: draft.asset.decimals,
  });

  return (
    <View>
      <Party label={t('send.status.from')}>
        {account ? (
          <View className="flex-row items-center gap-2">
            <View
              style={[styles.dot, { backgroundColor: fillOf(account.color) }]}
              accessibilityElementsHidden
            />
            <Text variant="label" className="flex-1" numberOfLines={1}>
              {accountLabel(account)}
            </Text>
            <Text variant="mono" tone="secondary">
              {shortenAddress(account.address)}
            </Text>
          </View>
        ) : null}
      </Party>
      <View style={styles.track}>
        <View style={[styles.line, { backgroundColor: colors.border.strong }]} />
        <Animated.View
          style={[styles.coin, { backgroundColor: colors.primary[600] }, coinStyle]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Coins size={ICON_SIZE.md} color={colors.content.inverse} />
        </Animated.View>
        <Text variant="label" style={styles.amount}>
          {amount} {draft.asset.symbol}
        </Text>
      </View>
      <Party label={t('send.status.to')}>
        <Text variant="mono">{shortenAddress(draft.to)}</Text>
      </Party>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: TRACK_HEIGHT, justifyContent: 'center', zIndex: 1 },
  line: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: COIN_SIZE,
    width: TRACK_WIDTH,
  },
  coin: {
    position: 'absolute',
    top: -COIN_SIZE / 2,
    left: COIN_SIZE - COIN_SIZE / 2 + TRACK_WIDTH / 2,
    width: COIN_SIZE,
    height: COIN_SIZE,
    borderRadius: COIN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amount: { marginLeft: COIN_SIZE * 2 },
  dot: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2 },
});
