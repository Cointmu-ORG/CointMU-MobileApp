import { router } from 'expo-router';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import CircleX from 'lucide-react-native/icons/circle-x';
import Clock from 'lucide-react-native/icons/clock';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Linking, View } from 'react-native';

import { explorerTxUrl, ROUTES } from '@/shared/config';
import { Button, colors, ICON_SIZE, Text } from '@/shared/ui';

import { useSendFlowStore } from '../model/send-flow-store';

const RESULT_ICON_SIZE = ICON_SIZE.lg * 2;

function finish() {
  useSendFlowStore.getState().reset();
  router.dismissTo(ROUTES.home);
}

/** Step 3 of Send. The pending record is already saved; the status poller takes over. */
export function SendResult() {
  const { t } = useTranslation();
  const outcome = useSendFlowStore((state) => state.outcome);
  // Android back means "Done": it never returns to the review of a transfer already broadcast.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      finish();
      return true;
    });
    return () => subscription.remove();
  }, []);
  if (outcome === null) return null;

  if (!outcome.ok) {
    return (
      <View className="gap-6">
        <View className="items-center gap-3">
          <CircleX size={RESULT_ICON_SIZE} color={colors.danger.strong} />
          <Text variant="title" accessibilityRole="header" className="text-center">
            {t('send.result.failedTitle')}
          </Text>
          <Text tone="secondary" className="text-center" accessibilityLiveRegion="polite">
            {t(`send.errors.${outcome.error}`)}
          </Text>
        </View>
        <Button label={t('send.result.tryAgain')} onPress={() => router.dismissTo(ROUTES.send)} />
        <Button variant="ghost" label={t('common.done')} onPress={finish} />
      </View>
    );
  }

  const link = explorerTxUrl(outcome.hash);
  const Icon = outcome.isUncertain ? Clock : CircleCheck;
  const kind = outcome.isUncertain ? 'uncertain' : 'sent';
  return (
    <View className="gap-6">
      <View className="items-center gap-3">
        <Icon size={RESULT_ICON_SIZE} color={colors.primary[600]} />
        <Text variant="title" accessibilityRole="header" className="text-center">
          {t(`send.result.${kind}Title`)}
        </Text>
        <Text tone="secondary" className="text-center" accessibilityLiveRegion="polite">
          {t(`send.result.${kind}Body`)}
        </Text>
      </View>
      <View className="gap-1">
        <Text variant="caption" tone="secondary">
          {t('send.result.hash')}
        </Text>
        <Text variant="mono" selectable>
          {outcome.hash}
        </Text>
      </View>
      {link ? (
        <Button
          variant="secondary"
          label={t('send.result.explorer')}
          onPress={() => void Linking.openURL(link)}
        />
      ) : null}
      <Button label={t('common.done')} onPress={finish} />
    </View>
  );
}
