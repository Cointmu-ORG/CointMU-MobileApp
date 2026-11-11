import Delete from 'lucide-react-native/icons/delete';
import Fingerprint from 'lucide-react-native/icons/fingerprint-pattern';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions, View } from 'react-native';

import { PressableSurface, SURFACE_PALETTE } from './pressable-surface';
import { Text } from './text';
import { useThemeColors } from './theme/theme-root';

const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const;

// Keys scale with the screen: ~23% of the width, capped by the height so the header, the dots
// and four rows fit a 375×667 screen (iPhone SE) below a native header without scrolling.
const KEY_WIDTH_RATIO = 0.23;
const KEY_HEIGHT_RATIO = 0.11;
const KEY_MIN_SIZE = 72;
const KEY_MAX_SIZE = 88;
const DIGIT_FONT_RATIO = 0.4;
const DIGIT_LINE_HEIGHT_RATIO = 1.2;
const ICON_RATIO = 0.36;

/** Diameter of one key in dp for a window size. */
export function pinKeySize(width: number, height: number): number {
  const fitted = Math.min(width * KEY_WIDTH_RATIO, height * KEY_HEIGHT_RATIO);
  return Math.round(Math.min(KEY_MAX_SIZE, Math.max(KEY_MIN_SIZE, fitted)));
}

type PinPadProps = {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  /** Omit to hide the biometrics key. */
  onBiometrics?: () => void;
  isDisabled?: boolean;
};

type PadKeyProps = {
  label: string;
  size: number;
  onPress: () => void;
  isDisabled: boolean;
  children: ReactNode;
};

function PadKey({ label, size, onPress, isDisabled, children }: PadKeyProps) {
  return (
    <PressableSurface
      palette={SURFACE_PALETTE.key}
      className="items-center justify-center rounded-full"
      surfaceStyle={{ width: size, height: size }}
      onPress={onPress}
      isDisabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {children}
    </PressableSurface>
  );
}

function DigitKey({ digit, ...rest }: { digit: string } & Omit<PadKeyProps, 'label' | 'children'>) {
  const fontSize = Math.round(rest.size * DIGIT_FONT_RATIO);
  return (
    <PadKey label={digit} {...rest}>
      <Text
        variant="heading"
        style={{ fontSize, lineHeight: Math.round(fontSize * DIGIT_LINE_HEIGHT_RATIO) }}
      >
        {digit}
      </Text>
    </PadKey>
  );
}

export function PinPad({ onDigit, onDelete, onBiometrics, isDisabled = false }: PinPadProps) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const size = pinKeySize(width, height);
  const iconSize = Math.round(size * ICON_RATIO);
  return (
    <View className="gap-3">
      {DIGIT_ROWS.map((row) => (
        <View key={row.join('')} className="flex-row justify-center gap-6">
          {row.map((digit) => (
            <DigitKey
              key={digit}
              digit={digit}
              size={size}
              onPress={() => onDigit(digit)}
              isDisabled={isDisabled}
            />
          ))}
        </View>
      ))}
      <View className="flex-row justify-center gap-6">
        {onBiometrics ? (
          <PadKey
            label={t('pinPad.biometrics')}
            size={size}
            onPress={onBiometrics}
            isDisabled={isDisabled}
          >
            <Fingerprint size={iconSize} color={colors.accent.DEFAULT} />
          </PadKey>
        ) : (
          <View style={{ width: size, height: size }} />
        )}
        <DigitKey digit="0" size={size} onPress={() => onDigit('0')} isDisabled={isDisabled} />
        <PadKey label={t('pinPad.delete')} size={size} onPress={onDelete} isDisabled={isDisabled}>
          <Delete size={iconSize} color={colors.content.secondary} />
        </PadKey>
      </View>
    </View>
  );
}
