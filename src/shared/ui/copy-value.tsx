import * as Clipboard from 'expo-clipboard';
import Check from 'lucide-react-native/icons/check';
import Copy from 'lucide-react-native/icons/copy';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { logger } from '../lib/diagnostics';
import { PressableSurface, SURFACE_PALETTE } from './pressable-surface';
import { Text } from './text';
import { ICON_SIZE } from './theme/icon-size';
import { useThemeColors } from './theme/theme-root';

const COPIED_FEEDBACK_MS = 2_000;

type CopyValueProps = {
  /** What reaches the clipboard: public data only (an address, a transaction id). */
  value: string;
  /** What is shown, e.g. a short address or an account name. */
  children: ReactNode;
  accessibilityLabel: string;
};

/**
 * A value that copies itself in full on tap, with a copy icon that turns into a check and a
 * spoken "Copied". Never pass a secret: mnemonics and private keys must not reach the clipboard.
 */
export function CopyValue({ value, children, accessibilityLabel }: CopyValueProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) return;
    const timer = setTimeout(() => setIsCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [isCopied]);

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(value);
      setIsCopied(true);
    } catch (error) {
      logger.warn('Copying a value failed', { error });
    }
  };

  // The negative margin lines the text up with plain values in a DetailRow; the padding keeps
  // the touch area.
  return (
    <PressableSurface
      palette={SURFACE_PALETTE.ghost}
      className="-mr-2 min-h-11 flex-row items-center justify-end gap-2 rounded-control px-2"
      onPress={() => void copy()}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={t('common.copyHint')}
    >
      {children}
      {isCopied ? (
        <>
          <Check size={ICON_SIZE.sm} color={colors.success.strong} />
          <Text variant="caption" tone="success" accessibilityLiveRegion="polite">
            {t('common.copied')}
          </Text>
        </>
      ) : (
        <Copy size={ICON_SIZE.sm} color={colors.content.secondary} />
      )}
    </PressableSurface>
  );
}
