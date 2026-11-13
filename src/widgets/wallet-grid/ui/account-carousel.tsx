import Plus from 'lucide-react-native/icons/plus';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { useUsableAccounts, useWalletStore } from '@/entities/wallet';
import { ICON_SIZE, PressableSurface, SURFACE_PALETTE, Text, useThemeColors } from '@/shared/ui';

import type { AccountRef } from '../model/types';
import { useAccountBalances } from '../model/use-account-balances';
import { AccountCard } from './account-card';
import { NetworkNotice } from './network-notice';

/** The screen padding the carousel bleeds out of, so cards slide to the screen edge. */
const SCREEN_GUTTER = 24;
const CARD_GAP = 12;
/** How much of the next card shows: the hint that there is more to the side. */
const NEXT_CARD_PEEK = 32;
const SCROLL_EVENT_INTERVAL_MS = 32;

type AccountCarouselProps = {
  onOpenAccount: (account: AccountRef) => void;
  onAccountMenu: (account: AccountRef) => void;
  onAdd: () => void;
  /** Balances poll only while the screen is shown. */
  isFocused?: boolean;
};

function AddCard({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  return (
    <PressableSurface
      palette={SURFACE_PALETTE.ghost}
      className="min-h-44 items-center justify-center gap-3 rounded-card border-2 border-dashed border-border-strong p-4"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('home.cards.add')}
    >
      <View className="h-12 w-12 items-center justify-center rounded-full bg-primary-50">
        <Plus size={ICON_SIZE.lg} color={colors.accent.DEFAULT} />
      </View>
      <Text variant="label" tone="primary">
        {t('home.cards.add')}
      </Text>
    </PressableSurface>
  );
}

/** One dot per page; the current one is a wider pill, so it does not rely on color. */
function PageDots({ count, current }: { count: number; current: number }) {
  const { t } = useTranslation();
  return (
    <View
      className="flex-row items-center justify-center gap-1.5"
      accessible
      accessibilityRole="text"
      accessibilityLabel={t('home.cards.position', { current: current + 1, total: count })}
    >
      {Array.from({ length: count }, (_, page) => (
        <View
          key={page}
          className={`h-2 rounded-full ${page === current ? 'w-5 bg-primary-600' : 'w-2 bg-border-strong'}`}
        />
      ))}
    </View>
  );
}

/**
 * Every usable account as a card, one per page, swiped sideways and snapping card by card, with
 * an "Add" card at the end and page dots below. The next card peeks in from the edge. Cards are
 * the Wallets tab's cards, so name, color, icon and the hidden balance look the same in both.
 */
export function AccountCarousel(props: AccountCarouselProps) {
  const { onOpenAccount, onAccountMenu, onAdd, isFocused = true } = props;
  const { width } = useWindowDimensions();
  const accounts = useUsableAccounts();
  const defaultAccount = useWalletStore((state) => state.defaultAccount);
  const addresses = accounts.map((account) => account.address);
  useAccountBalances(addresses, isFocused);
  const [page, setPage] = useState(0);

  const cardWidth = width - SCREEN_GUTTER * 2 - NEXT_CARD_PEEK;
  const interval = cardWidth + CARD_GAP;
  const pageCount = accounts.length + 1;
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / interval);
    setPage(Math.max(0, Math.min(pageCount - 1, next)));
  };

  return (
    <View className="gap-3">
      <NetworkNotice addresses={addresses} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={interval}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        onScroll={onScroll}
        scrollEventThrottle={SCROLL_EVENT_INTERVAL_MS}
        style={{ marginHorizontal: -SCREEN_GUTTER }}
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, gap: CARD_GAP }}
        testID="account-carousel"
      >
        {accounts.map((account) => {
          const ref = { walletId: account.walletId, index: account.index };
          return (
            <View key={`${account.walletId}:${account.index}`} style={{ width: cardWidth }}>
              <AccountCard
                account={account}
                size="wide"
                isDefault={
                  defaultAccount?.walletId === account.walletId &&
                  defaultAccount.index === account.index
                }
                onPress={() => onOpenAccount(ref)}
                onMenu={() => onAccountMenu(ref)}
              />
            </View>
          );
        })}
        <View style={{ width: cardWidth }}>
          <AddCard onPress={onAdd} />
        </View>
      </ScrollView>
      <PageDots count={pageCount} current={page} />
    </View>
  );
}
