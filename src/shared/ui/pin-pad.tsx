import Delete from 'lucide-react-native/icons/delete';
import Fingerprint from 'lucide-react-native/icons/fingerprint-pattern';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from './text';
import { colors } from './theme/colors';
import { usePressScale } from './use-press-scale';

const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const;
const ICON_SIZE = 26;

type PinPadProps = {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  /** Omit to hide the biometrics key. */
  onBiometrics?: () => void;
  isDisabled?: boolean;
};

type PadKeyProps = {
  label: string;
  onPress: () => void;
  isDisabled: boolean;
  children: ReactNode;
};

function PadKey({ label, onPress, isDisabled, children }: PadKeyProps) {
  const press = usePressScale();
  return (
    <Animated.View style={press.style}>
      <Pressable
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: isDisabled }}
      >
        <View
          className={`h-16 w-16 items-center justify-center rounded-full bg-surface-card ${
            isDisabled ? 'opacity-50' : ''
          }`}
        >
          {children}
        </View>
      </Pressable>
    </Animated.View>
  );
}

function DigitKey({ digit, ...rest }: { digit: string } & Omit<PadKeyProps, 'label' | 'children'>) {
  return (
    <PadKey label={digit} {...rest}>
      <Text variant="heading">{digit}</Text>
    </PadKey>
  );
}

export function PinPad({ onDigit, onDelete, onBiometrics, isDisabled = false }: PinPadProps) {
  const { t } = useTranslation();
  return (
    <View className="gap-4">
      {DIGIT_ROWS.map((row) => (
        <View key={row.join('')} className="flex-row justify-around">
          {row.map((digit) => (
            <DigitKey
              key={digit}
              digit={digit}
              onPress={() => onDigit(digit)}
              isDisabled={isDisabled}
            />
          ))}
        </View>
      ))}
      <View className="flex-row justify-around">
        {onBiometrics ? (
          <PadKey label={t('pinPad.biometrics')} onPress={onBiometrics} isDisabled={isDisabled}>
            <Fingerprint size={ICON_SIZE} color={colors.primary[600]} />
          </PadKey>
        ) : (
          <View className="h-16 w-16" />
        )}
        <DigitKey digit="0" onPress={() => onDigit('0')} isDisabled={isDisabled} />
        <PadKey label={t('pinPad.delete')} onPress={onDelete} isDisabled={isDisabled}>
          <Delete size={ICON_SIZE} color={colors.content.secondary} />
        </PadKey>
      </View>
    </View>
  );
}
