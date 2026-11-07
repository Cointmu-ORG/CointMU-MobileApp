import CircleCheck from 'lucide-react-native/icons/circle-check';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { NewPinForm, PinPrompt, storeNewPin } from '@/entities/auth';
import { Button, colors, Text } from '@/shared/ui';

type Step = 'current' | 'new' | 'done';
const DONE_ICON_SIZE = 48;

/**
 * Current PIN first (PIN only, no biometrics; failures count toward the shared lockout), then
 * the new PIN twice. Only the new record's hash is stored.
 */
export function ChangePinFlow({ onFinished }: { onFinished: () => void }) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('current');
  const save = useCallback(async (pin: string) => {
    await storeNewPin(pin);
    setStep('done');
  }, []);

  if (step === 'current') {
    return (
      <PinPrompt
        title={t('settings.changePin.currentTitle')}
        subtitle={t('settings.changePin.currentSubtitle')}
        onVerified={() => setStep('new')}
      />
    );
  }
  if (step === 'new') {
    return (
      <NewPinForm
        createTitle={t('settings.changePin.newTitle')}
        confirmTitle={t('settings.changePin.confirmTitle')}
        subtitle={t('settings.changePin.newSubtitle')}
        errorMessage={t('settings.changePin.error')}
        onConfirmed={save}
      />
    );
  }
  return (
    <View className="flex-1 items-center justify-center gap-6">
      <CircleCheck size={DONE_ICON_SIZE} color={colors.success.strong} />
      <Text variant="title" className="text-center" accessibilityRole="header">
        {t('settings.changePin.done')}
      </Text>
      <View className="self-stretch">
        <Button label={t('common.done')} onPress={onFinished} />
      </View>
    </View>
  );
}
