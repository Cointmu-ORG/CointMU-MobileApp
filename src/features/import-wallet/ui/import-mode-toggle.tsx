import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Text } from '@/shared/ui';

export type ImportMode = 'mnemonic' | 'private-key';

const MODES: readonly { mode: ImportMode; labelKey: string }[] = [
  { mode: 'mnemonic', labelKey: 'onboarding.import.modeMnemonic' },
  { mode: 'private-key', labelKey: 'onboarding.import.modePrivateKey' },
];

type ImportModeToggleProps = {
  mode: ImportMode;
  onChange: (mode: ImportMode) => void;
};

export function ImportModeToggle({ mode, onChange }: ImportModeToggleProps) {
  const { t } = useTranslation();
  return (
    <View className="flex-row rounded-control bg-surface-muted p-1" accessibilityRole="tablist">
      {MODES.map((option) => {
        const isSelected = option.mode === mode;
        return (
          <Pressable
            key={option.mode}
            className="flex-1"
            onPress={() => onChange(option.mode)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
          >
            <View
              className={`items-center rounded-lg py-3 ${isSelected ? 'bg-surface-card shadow-sm' : ''}`}
            >
              <Text variant="label" tone={isSelected ? 'primary' : 'secondary'}>
                {t(option.labelKey)}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
