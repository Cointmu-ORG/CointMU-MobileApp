import { router } from 'expo-router';
import ArrowDownLeft from 'lucide-react-native/icons/arrow-down-left';
import ArrowUpRight from 'lucide-react-native/icons/arrow-up-right';
import ScanLine from 'lucide-react-native/icons/scan-line';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { ROUTES } from '@/shared/config';
import { ICON_SIZE, PressableSurface, SURFACE_PALETTE, Text, useThemeColors } from '@/shared/ui';

type Action = { label: string; Icon: LucideIcon; onPress: () => void };

function DetailAction({ label, Icon, onPress }: Action) {
  const colors = useThemeColors();
  return (
    <PressableSurface
      palette={SURFACE_PALETTE.ghost}
      className="min-w-20 items-center gap-2 rounded-card px-3 py-2"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View className="h-14 w-14 items-center justify-center rounded-full bg-primary-600">
        <Icon size={ICON_SIZE.lg} color={colors.content.inverse} />
      </View>
      <Text variant="label">{label}</Text>
    </PressableSurface>
  );
}

type DetailActionsProps = { account: { readonly walletId: string; readonly index: number } };

/**
 * Send, Receive and Scan for the account on screen. It is the remembered account while its
 * screen is open, so Send and Scan open the send form with it as the source.
 */
export function DetailActions({ account }: DetailActionsProps) {
  const { t } = useTranslation();
  return (
    <View className="flex-row justify-around">
      <DetailAction
        label={t('home.actions.send')}
        Icon={ArrowUpRight}
        onPress={() => router.push(ROUTES.send)}
      />
      <DetailAction
        label={t('home.actions.receive')}
        Icon={ArrowDownLeft}
        onPress={() => router.push({ pathname: ROUTES.receive, params: account })}
      />
      <DetailAction
        label={t('home.actions.scan')}
        Icon={ScanLine}
        onPress={() => router.push(ROUTES.scan)}
      />
    </View>
  );
}
