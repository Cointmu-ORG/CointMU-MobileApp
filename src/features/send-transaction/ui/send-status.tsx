import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Linking, View } from 'react-native';

import { TX_POLICY } from '@/entities/transaction';
import { explorerTxUrl, ROUTES } from '@/shared/config';
import { Button, ICON_SIZE, Spinner, Text, useThemeColors } from '@/shared/ui';

import {
  coinPosition,
  isProblemPhase,
  isSuccessPhase,
  ringProgress,
  stepStates,
  type SendPhase,
} from '../lib/send-phase';
import { useSendFlowStore } from '../model/send-flow-store';
import { ConfirmationRing } from './confirmation-ring';
import { PHASE_VIEW } from './phase-view';
import { SendRoute } from './send-route';
import { StatusSteps } from './status-steps';
import { usePhaseHaptics, useSendPhase } from './use-send-phase';

const STATUS_ICON_SIZE = ICON_SIZE.lg * 2;
const TOTAL = TX_POLICY.finalConfirmations;

function finish() {
  useSendFlowStore.getState().reset();
  router.dismissTo(ROUTES.home);
}

/** Android back: nothing while signing and broadcasting, "Done" afterwards. Never the review. */
function useHardwareBack(isSending: boolean) {
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isSending) finish();
      return true;
    });
    return () => subscription.remove();
  }, [isSending]);
}

/** The ring (or the spinner while sending) with the phase's icon, then its title and body. */
function PhaseStatus({ phase, confirmations }: { phase: SendPhase; confirmations: number }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const stage = useSendFlowStore((state) => state.stage);
  const outcome = useSendFlowStore((state) => state.outcome);

  if (phase === 'sending') {
    const stageText = t(`send.stage.${stage ?? 'checkingNetwork'}`);
    return (
      <View className="items-center gap-3">
        <Spinner label={stageText} />
        <Text variant="heading" accessibilityRole="header" className="text-center">
          {stageText}
        </Text>
        <Text tone="secondary" className="text-center" accessibilityLiveRegion="polite">
          {t('send.status.sendingBody')}
        </Text>
      </View>
    );
  }

  const { Icon, color, titleKey, bodyKey } = PHASE_VIEW[phase];
  const tint = color(colors);
  const body =
    bodyKey === null
      ? t(`send.errors.${outcome && !outcome.ok ? outcome.error : 'unknown'}`)
      : t(bodyKey, { total: TOTAL });
  return (
    <View className="items-center gap-3">
      <ConfirmationRing
        progress={ringProgress(phase, confirmations, TOTAL)}
        color={tint}
        accessibilityLabel={t('send.status.progress', { count: confirmations, total: TOTAL })}
      >
        <View testID={isSuccessPhase(phase) ? 'send-success-mark' : 'send-status-mark'}>
          <Icon size={STATUS_ICON_SIZE} color={tint} />
        </View>
      </ConfirmationRing>
      <Text variant="title" accessibilityRole="header" className="text-center">
        {t(titleKey)}
      </Text>
      <Text tone="secondary" className="text-center" accessibilityLiveRegion="polite">
        {body}
      </Text>
    </View>
  );
}

function HashAndExplorer({ hash }: { hash: string }) {
  const { t } = useTranslation();
  const link = explorerTxUrl(hash);
  return (
    <>
      <View className="gap-1">
        <Text variant="caption" tone="secondary">
          {t('send.result.hash')}
        </Text>
        <Text variant="mono" selectable>
          {hash}
        </Text>
      </View>
      {link ? (
        <Button
          variant="secondary"
          label={t('send.result.explorer')}
          onPress={() => void Linking.openURL(link)}
        />
      ) : null}
    </>
  );
}

/**
 * Step 3 of Send: one screen that follows the real transfer (D-81). While the transfer is signed
 * and broadcast it shows a calm spinner and no success styling. When the node accepts it, the
 * coin travels to the recipient and the text says "Sent to the network". From then on the status
 * poller drives the ring and the steps: pending, confirmed n/12, final. The check mark and the
 * success haptic only come with the first confirmation. A send that failed, reverted, was
 * dropped or replaced, or whose broadcast timed out, each has its own state.
 */
export function SendStatus() {
  const { t } = useTranslation();
  const draft = useSendFlowStore((state) => state.draft);
  const outcome = useSendFlowStore((state) => state.outcome);
  const { phase, confirmations } = useSendPhase();
  usePhaseHaptics(phase);
  useHardwareBack(phase === 'sending');

  const confirmationsText =
    phase === 'confirmed' || phase === 'final'
      ? `${Math.min(Math.max(confirmations, 1), TOTAL)}/${TOTAL}`
      : null;

  return (
    <View className="gap-6">
      {draft ? <SendRoute draft={draft} coinAt={coinPosition(phase)} /> : null}
      <PhaseStatus phase={phase} confirmations={confirmations} />
      {isProblemPhase(phase) ? null : (
        <StatusSteps states={stepStates(phase)} confirmationsText={confirmationsText} />
      )}
      {outcome?.ok ? <HashAndExplorer hash={outcome.hash} /> : null}
      {phase === 'notSent' ? (
        <Button label={t('send.result.tryAgain')} onPress={() => router.dismissTo(ROUTES.send)} />
      ) : null}
      {phase === 'sending' ? null : (
        <Button
          variant={phase === 'notSent' ? 'ghost' : 'primary'}
          label={t('common.done')}
          onPress={finish}
        />
      )}
    </View>
  );
}
