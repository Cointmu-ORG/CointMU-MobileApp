import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text, useCardFill, useThemeColors } from '@/shared/ui';

import { ACCOUNT_LUCIDE_ICONS } from '../config/account-icons';
import { resolveAccountIcon } from '../lib/account-icon';
import type { AccountIcon, WalletAccount } from '../model/types';

/** Finds the icon a card, badge or preview is showing, e.g. `account-icon:lucide:piggy-bank`. */
export function accountIconTestId(icon: AccountIcon): string {
  const resolved = resolveAccountIcon(icon);
  return `account-icon:${resolved.kind}:${resolved.kind === 'lucide' ? resolved.name : resolved.value}`;
}

/**
 * The spoken name of an icon. A lucide icon has a translated label; an emoji is passed as it
 * is, because VoiceOver and TalkBack read an emoji by its own name in the phone's language.
 */
export function useAccountIconLabel(): (icon: AccountIcon) => string {
  const { t } = useTranslation();
  return (icon) => {
    const resolved = resolveAccountIcon(icon);
    return resolved.kind === 'lucide' ? t(`wallets.icons.lucide.${resolved.name}`) : resolved.value;
  };
}

type AccountIconGlyphProps = {
  icon: AccountIcon;
  /** Box of the icon in dp; an emoji is drawn to fill the same box. */
  size: number;
  /** Stroke color of a lucide icon. An emoji keeps its own colors. */
  color: string;
};

/**
 * An account's icon alone, always decorative: the name next to it is what is read out. The
 * emoji size is fixed so it stays inside its tile at any text size.
 */
export function AccountIconGlyph({ icon, size, color }: AccountIconGlyphProps) {
  const resolved = resolveAccountIcon(icon);
  if (resolved.kind === 'emoji') {
    return (
      <Text
        allowFontScaling={false}
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[styles.emoji, { fontSize: size, lineHeight: size * EMOJI_LINE_HEIGHT }]}
      >
        {resolved.value}
      </Text>
    );
  }
  const Icon = ACCOUNT_LUCIDE_ICONS[resolved.name];
  return <Icon size={size} color={color} />;
}

/** The icon on a colored card: a translucent disc in the card's text color under the icon. */
export function AccountIconTile({ icon }: { icon: AccountIcon }) {
  const colors = useThemeColors();
  return (
    <View style={[styles.disc, styles.tile]} testID={accountIconTestId(icon)}>
      <View
        style={[styles.tileFill, { backgroundColor: colors.content.inverse }]}
        accessibilityElementsHidden
      />
      <AccountIconGlyph icon={icon} size={TILE_ICON_SIZE} color={colors.content.inverse} />
    </View>
  );
}

type AccountBadgeProps = {
  account: Pick<WalletAccount, 'color' | 'icon'>;
  /** Diameter in dp. */
  size: number;
};

/** An account off its card (rows, the home chip): its icon on a disc of its card color. */
export function AccountBadge({ account, size }: AccountBadgeProps) {
  const colors = useThemeColors();
  const fill = useCardFill()(account.color);
  return (
    <View
      style={[styles.disc, { width: size, height: size, backgroundColor: fill }]}
      testID={accountIconTestId(account.icon)}
    >
      <AccountIconGlyph
        icon={account.icon}
        size={size * BADGE_ICON_RATIO}
        color={colors.content.inverse}
      />
    </View>
  );
}

const TILE_SIZE = 36;
const TILE_ICON_SIZE = 20;
const TILE_FILL_OPACITY = 0.18;
const BADGE_ICON_RATIO = 0.56;
// Room for the emoji's ascent and descent, which Android clips at a line height of 1.
const EMOJI_LINE_HEIGHT = 1.3;
const ROUND = 999;

const styles = StyleSheet.create({
  disc: { borderRadius: ROUND, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tile: { width: TILE_SIZE, height: TILE_SIZE },
  tileFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: TILE_FILL_OPACITY,
  },
  emoji: { textAlign: 'center', includeFontPadding: false },
});
