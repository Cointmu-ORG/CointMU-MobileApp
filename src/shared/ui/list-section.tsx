import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from './text';

type ListSectionProps = {
  title?: string;
  /** Explanation under the group. */
  footer?: string;
  children: ReactNode;
};

/** A titled group of ListRows on one card, separated by hairlines. */
export function ListSection({ title, footer, children }: ListSectionProps) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View className="gap-2">
      {title ? (
        <Text variant="label" tone="secondary" className="px-1" accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      <View className="overflow-hidden rounded-card border border-border bg-surface-card">
        {rows.map((row, index) => (
          <Fragment key={isValidElement(row) && row.key !== null ? row.key : index}>
            {index > 0 ? <View className="ml-4 h-px bg-border" /> : null}
            {row}
          </Fragment>
        ))}
      </View>
      {footer ? (
        <Text variant="caption" tone="secondary" className="px-1">
          {footer}
        </Text>
      ) : null}
    </View>
  );
}
