import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { ListRow } from './list-row';
import { ListSection } from './list-section';
import { SegmentedControl, type SegmentOption } from './segmented-control';
import { Text } from './text';
import { ThemedSwitch } from './themed-switch';

type SettingsSectionProps = {
  title?: string;
  /** Explanation under the group. */
  footer?: string;
  children: ReactNode;
};

/** A titled card of settings rows. Every settings screen is built from these. */
export function SettingsSection(props: SettingsSectionProps) {
  return <ListSection {...props} />;
}

type SettingsRowProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** The current value, shown before the chevron (the active node, the chosen theme). */
  value?: string;
  /** Opens the setting's own screen, or runs the action. Omit for a read-only row. */
  onPress?: () => void;
  /** Replaces the chevron, e.g. an "opens in browser" mark. */
  trailing?: ReactNode;
  isDestructive?: boolean;
  isDisabled?: boolean;
  accessibilityRole?: 'button' | 'link';
  accessibilityHint?: string;
};

/** The one settings row: icon tile, title, current value, chevron. */
export function SettingsRow(props: SettingsRowProps) {
  return <ListRow {...props} />;
}

type SettingsSwitchRowProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  isDisabled?: boolean;
};

/** A setting that is on or off. The whole row carries the label; the switch carries the state. */
export function SettingsSwitchRow({
  icon,
  title,
  description,
  value,
  onValueChange,
  isDisabled = false,
}: SettingsSwitchRowProps) {
  return (
    <ListRow
      icon={icon}
      title={title}
      description={description}
      trailing={
        <ThemedSwitch
          value={value}
          onValueChange={onValueChange}
          isDisabled={isDisabled}
          accessibilityLabel={title}
        />
      }
    />
  );
}

type SettingsChoiceRowProps<T extends string> = {
  title: string;
  description?: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** A setting with a few named values, picked inline. */
export function SettingsChoiceRow<T extends string>({
  title,
  description,
  options,
  value,
  onChange,
}: SettingsChoiceRowProps<T>) {
  return (
    <View className="gap-3 bg-surface-card px-4 py-3">
      <View className="gap-0.5">
        <Text variant="label">{title}</Text>
        {description ? (
          <Text variant="caption" tone="secondary">
            {description}
          </Text>
        ) : null}
      </View>
      <SegmentedControl
        accessibilityLabel={title}
        options={options}
        value={value}
        onChange={onChange}
      />
    </View>
  );
}
