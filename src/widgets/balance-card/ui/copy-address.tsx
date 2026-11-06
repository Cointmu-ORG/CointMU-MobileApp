import * as Clipboard from 'expo-clipboard';
import Check from 'lucide-react-native/icons/check';
import Copy from 'lucide-react-native/icons/copy';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { logger, shortenAddress } from '@/shared/lib';
import { colors, Text } from '@/shared/ui';

const ICON_SIZE = 16;
const COPIED_FEEDBACK_MS = 2_000;

export function CopyAddress({ address }: { address: string }) {
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
    <Pressable
      onPress={() => void copy()}
      accessibilityRole="button"
      accessibilityLabel={t('home.balance.copyAddress')}
      accessibilityHint={address}
    >
      <View className="flex-row items-center gap-2 self-start rounded-full bg-surface-muted px-3 py-2">
        <Text variant="mono" tone="secondary">
          {shortenAddress(address)}
        </Text>
        {isCopied ? (
          <Check size={ICON_SIZE} color={colors.success.DEFAULT} />
        ) : (
          <Copy size={ICON_SIZE} color={colors.content.secondary} />
        )}
      </View>
      {isCopied ? (
        <Text variant="caption" tone="success" accessibilityLiveRegion="polite" className="mt-1">
          {t('home.balance.copied')}
        </Text>
      ) : null}
    </Pressable>
  );
}
