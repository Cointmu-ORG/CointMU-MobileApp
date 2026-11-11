import * as Clipboard from 'expo-clipboard';
import ClipboardPaste from 'lucide-react-native/icons/clipboard-paste';
import ScanLine from 'lucide-react-native/icons/scan-line';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  ICON_SIZE,
  Input,
  PressableSurface,
  SURFACE_PALETTE,
  Text,
  useThemeColors,
} from '@/shared/ui';

type RecipientFieldProps = {
  value: string;
  error: string | null;
  onChange: (value: string) => void;
  onScan: () => void;
};

function FieldAction({
  label,
  Icon,
  onPress,
}: {
  label: string;
  Icon: LucideIcon;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <PressableSurface
      palette={SURFACE_PALETTE.secondary}
      containerClassName="flex-1"
      className="min-h-12 flex-row items-center justify-center gap-2 rounded-control px-3"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon size={ICON_SIZE.md} color={colors.accent.DEFAULT} />
      <Text variant="label" tone="primary">
        {label}
      </Text>
    </PressableSurface>
  );
}

/** Recipient address with paste and scan. Scanning only fills the form; nothing is sent. */
export function RecipientField({ value, error, onChange, onScan }: RecipientFieldProps) {
  const { t } = useTranslation();
  const paste = async () => onChange((await Clipboard.getStringAsync()).trim());
  return (
    <View className="gap-2">
      <Input
        label={t('send.form.recipient')}
        placeholder="0x…"
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
        autoCorrect={false}
        status={error ? 'error' : 'default'}
        message={error ?? undefined}
      />
      <View className="flex-row gap-3">
        <FieldAction label={t('common.paste')} Icon={ClipboardPaste} onPress={() => void paste()} />
        <FieldAction label={t('send.form.scan')} Icon={ScanLine} onPress={onScan} />
      </View>
    </View>
  );
}
