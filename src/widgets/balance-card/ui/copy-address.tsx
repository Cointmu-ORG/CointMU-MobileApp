import * as Clipboard from 'expo-clipboard';
import Check from 'lucide-react-native/icons/check';
import Copy from 'lucide-react-native/icons/copy';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { logger, shortenAddress } from '@/shared/lib';
import { PressableSurface, SURFACE_PALETTE, Text, useThemeColors } from '@/shared/ui';

const ICON_SIZE = 16;
const COPIED_FEEDBACK_MS = 2_000;

export function CopyAddress({ address }: { address: string }) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) return;
    const timer = setTimeout(() => setIsCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [isCopied]);

  const copy = async () => {
    try {
      // The only clipboard write in the app: the user's own public address. Mnemonics and
      // private keys must never reach the clipboard (forbidden rule 2).
      await Clipboard.setStringAsync(address);
      setIsCopied(true);
    } catch (error) {
      logger.warn('Copying address failed', { error });
    }
  };

  return (
    <View className="items-start gap-1">
      <PressableSurface
        palette={SURFACE_PALETTE.quiet}
        className="min-h-11 flex-row items-center gap-2 rounded-full px-4"
        onPress={() => void copy()}
        accessibilityRole="button"
        accessibilityLabel={t('home.balance.copyAddress')}
        accessibilityHint={address}
      >
        <Text variant="mono">{shortenAddress(address)}</Text>
        {isCopied ? (
          <Check size={ICON_SIZE} color={colors.success.strong} />
        ) : (
          <Copy size={ICON_SIZE} color={colors.content.secondary} />
        )}
      </PressableSurface>
      {isCopied ? (
        <Text variant="caption" tone="success" accessibilityLiveRegion="polite">
          {t('home.balance.copied')}
        </Text>
      ) : null}
    </View>
  );
}
