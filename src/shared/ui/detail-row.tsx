import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from './text';

type DetailRowProps = {
  label: string;
  /** The value, right-aligned; a string is wrapped in body text. */
  children: ReactNode;
};

/** One "label … value" line of a receipt or a detail card. The value may wrap; nothing is cut. */
export function DetailRow({ label, children }: DetailRowProps) {
  return (
    <View className="min-h-11 flex-row items-center justify-between gap-4 py-1">
      <Text variant="label" tone="secondary">
        {label}
      </Text>
      <View className="shrink items-end">
        {typeof children === 'string' ? <Text className="text-right">{children}</Text> : children}
      </View>
    </View>
  );
}
