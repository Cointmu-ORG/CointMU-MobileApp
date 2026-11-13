import Check from 'lucide-react-native/icons/check';
import Ellipsis from 'lucide-react-native/icons/ellipsis';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { balanceOf, useAccountBalancesStore } from '@/entities/account';
import { NATIVE_ASSET } from '@/entities/asset';
import { AccountIconTile, useAccountLabel, type WalletAccount } from '@/entities/wallet';
import { shortenAddress } from '@/shared/lib';
import { useAmountDisplay } from '@/shared/model';
import {
  ICON_SIZE,
  PressableSurface,
  Skeleton,
  SURFACE_PALETTE,
  Text,
  useCardFill,
  useThemeColors,
} from '@/shared/ui';

/** `grid`: two per row in the Wallets tab. `wide`: one per page in the home carousel. */
export type AccountCardSize = 'grid' | 'wide';

const SIZE = {
  grid: { card: 'min-h-40 p-3', balance: 'heading' },
  wide: { card: 'min-h-44 p-4', balance: 'title' },
} as const;

type AccountCardProps = {
  account: WalletAccount;
  isActive: boolean;
  size?: AccountCardSize;
  onPress: () => void;
  /** The "…" button and a long press both open the account's menu. */
  onMenu: () => void;
};

/** The balance line: the amount, a placeholder while it loads, or a short failure note. */
function CardBalance({ address, size }: { address: string; size: AccountCardSize }) {
  const { t } = useTranslation();
  const { formatBalance } = useAmountDisplay();
  const { wei, status } = useAccountBalancesStore((state) => balanceOf(state.balances, address));

  if (wei !== null) {
    return (
      <Text variant={SIZE[size].balance} tone="inverse" numberOfLines={1} adjustsFontSizeToFit>
        {formatBalance(wei, NATIVE_ASSET.decimals)} {NATIVE_ASSET.symbol}
      </Text>
    );
  }
  if (status === 'error') {
    return (
      <Text variant="label" tone="inverse" numberOfLines={2}>
        {t('wallets.card.balanceError')}
      </Text>
    );
  }
  return (
    <View accessibilityLabel={t('wallets.card.balanceLoading')} style={styles.skeleton}>
      <Skeleton className="h-6 w-24 rounded-lg" />
    </View>
  );
}

/** Two faint rings in the corner: Muvo's own mark for a card. Decoration only, behind no text. */
function CardRings() {
  const colors = useThemeColors();
  const ring = { borderColor: colors.content.inverse };
  return (
    <View style={styles.rings} pointerEvents="none" accessibilityElementsHidden>
      <View style={[styles.ring, styles.ringOuter, ring]} />
      <View style={[styles.ring, styles.ringInner, ring]} />
    </View>
  );
}

function ActiveBadge({ fill }: { fill: string }) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center gap-1 rounded-full bg-content-inverse px-2 py-0.5">
      <Check size={ICON_SIZE.sm} color={fill} accessibilityElementsHidden />
      <Text variant="caption" className="font-semibold" style={{ color: fill }}>
        {t('wallets.card.active')}
      </Text>
    </View>
  );
}

/**
 * One account as a card in the user's color (D-80) with the user's icon (D-84): name, native balance, short address
 * and an "Active" badge. A tap opens the account; the menu holds the rest. It fills the width it
 * is given. Text and icons are white on the fill, which the palette test keeps at AA in both
 * themes.
 */
export function AccountCard(props: AccountCardProps) {
  const { account, isActive, size = 'grid', onPress, onMenu } = props;
  const { t } = useTranslation();
  const colors = useThemeColors();
  const label = useAccountLabel();
  const fill = useCardFill()(account.color);
  const name = label(account);

  return (
    <PressableSurface
      palette={SURFACE_PALETTE.tinted}
      className={`justify-between overflow-hidden rounded-card ${SIZE[size].card}`}
      surfaceStyle={{ backgroundColor: fill }}
      onPress={onPress}
      onLongPress={onMenu}
      accessibilityRole="button"
      accessibilityLabel={t(isActive ? 'wallets.card.labelActive' : 'wallets.card.label', {
        name,
        address: shortenAddress(account.address),
      })}
      accessibilityHint={t('wallets.card.hint')}
      accessibilityState={{ selected: isActive }}
    >
      <CardRings />
      <View className="flex-row items-start justify-between">
        <AccountIconTile icon={account.icon} />
        <PressableSurface
          palette={SURFACE_PALETTE.tinted}
          className="-mr-2 -mt-2 h-11 w-11 items-center justify-center rounded-full"
          onPress={onMenu}
          accessibilityRole="button"
          accessibilityLabel={t('wallets.card.menu', { name })}
        >
          <Ellipsis size={ICON_SIZE.md} color={colors.content.inverse} />
        </PressableSurface>
      </View>
      <View className="gap-1">
        <Text variant="label" tone="inverse" numberOfLines={1}>
          {name}
        </Text>
        <CardBalance address={account.address} size={size} />
        <View className="min-h-6 flex-row flex-wrap items-center justify-between gap-1">
          <Text variant="caption" tone="inverse" className="font-mono">
            {shortenAddress(account.address)}
          </Text>
          {isActive ? <ActiveBadge fill={fill} /> : null}
        </View>
      </View>
    </PressableSurface>
  );
}

const RING_OUTER_SIZE = 132;
const RING_INNER_SIZE = 84;
const RING_WIDTH = 10;
const RING_OPACITY = 0.14;
const RINGS_OFFSET = -44;
// The skeleton pulses in the muted surface color; on a colored card it reads as a soft bar.
const SKELETON_OPACITY = 0.35;

const styles = StyleSheet.create({
  rings: {
    position: 'absolute',
    top: RINGS_OFFSET,
    right: RINGS_OFFSET,
    width: RING_OUTER_SIZE,
    height: RING_OUTER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: { position: 'absolute', borderWidth: RING_WIDTH, opacity: RING_OPACITY },
  ringOuter: {
    width: RING_OUTER_SIZE,
    height: RING_OUTER_SIZE,
    borderRadius: RING_OUTER_SIZE / 2,
  },
  ringInner: {
    width: RING_INNER_SIZE,
    height: RING_INNER_SIZE,
    borderRadius: RING_INNER_SIZE / 2,
  },
  skeleton: { opacity: SKELETON_OPACITY },
});
