import type { ReactNode } from 'react';
import { View } from 'react-native';

import { PinDots } from './pin-dots';
import { PinPad } from './pin-pad';
import { Spinner } from './spinner';
import { Text } from './text';

type PinEntryProps = {
  title: string;
  subtitle?: string;
  /** Shown above the title, e.g. the logo on the lock screen. */
  logo?: ReactNode;
  length: number;
  filledCount: number;
  /** Increment to play the wrong-PIN shake and haptic. */
  errorSignal: number;
  /** Error or lockout text under the dots. */
  error?: string | null;
  /** Set while the PIN is checked or saved: shows a spinner with this text, disables the pad. */
  busyLabel?: string | null;
  /** Extra content under the status line, e.g. the reset offer. */
  footer?: ReactNode;
  onDigit: (digit: string) => void;
  onDelete: () => void;
  /** Omit to hide the biometrics key. */
  onBiometrics?: () => void;
  isDisabled?: boolean;
};

/**
 * The one PIN layout: header (logo, title, subtitle, dots, status) at the top and the keypad
 * anchored to the bottom of the screen. Every PIN screen uses it, so they cannot drift apart.
 * Needs a parent with a height (a Screen, or a scroll screen whose content grows).
 */
export function PinEntry(props: PinEntryProps) {
  const { title, subtitle, logo, error, busyLabel, footer } = props;
  const isBusy = busyLabel !== null && busyLabel !== undefined;
  return (
    <View className="flex-1 justify-between gap-6">
      <View className="items-center gap-5 pt-4">
        {logo}
        <View className="gap-2">
          <Text variant="title" className="text-center" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text tone="secondary" className="text-center">
              {subtitle}
            </Text>
          ) : null}
        </View>
        <PinDots
          length={props.length}
          filledCount={isBusy ? props.length : props.filledCount}
          errorSignal={props.errorSignal}
        />
        <View className="min-h-12 items-center gap-3">
          {isBusy ? <Spinner size="small" /> : null}
          <Text
            tone={isBusy ? 'secondary' : 'danger'}
            className="text-center"
            accessibilityLiveRegion="polite"
          >
            {busyLabel ?? error ?? ''}
          </Text>
          {footer}
        </View>
      </View>
      <PinPad
        onDigit={props.onDigit}
        onDelete={props.onDelete}
        onBiometrics={props.onBiometrics}
        isDisabled={isBusy || props.isDisabled}
      />
    </View>
  );
}
