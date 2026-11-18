import { router } from 'expo-router';
import Share2 from 'lucide-react-native/icons/share-2';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { LocalTxRecord } from '@/entities/transaction';
import { ROUTES } from '@/shared/config';
import { Button, ICON_SIZE, useThemeColors } from '@/shared/ui';

import type { SendPhase } from '../lib/send-phase';
import { useSendFlowStore, type SendDraft } from '../model/send-flow-store';
import { ReceiptAmount } from './receipt-amount';
import { ReceiptCard } from './receipt-card';
import { ReceiptTechnical } from './receipt-technical';
import { StatusHero } from './status-hero';
import { usePhaseHaptics, useSendPhase } from './use-send-phase';
import { useShareReceipt } from './use-share-receipt';

/** Space between the buttons and the home indicator, on top of the safe area. */
const FOOTER_BOTTOM_GAP = 12;

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

type ShareButtonProps = {
  draft: SendDraft;
  phase: SendPhase;
  hash: string;
  record: LocalTxRecord | null;
};

function ShareButton(props: ShareButtonProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const share = useShareReceipt(props);
  return (
    <Button
      variant="secondary"
      label={t('send.receipt.share')}
      icon={<Share2 size={ICON_SIZE.md} color={colors.accent.DEFAULT} />}
      onPress={() => void share()}
    />
  );
}

/**
 * The buttons, outside the scroll view and above the bottom safe area: Done is always fully on
 * screen however long the receipt is. Nothing here while the transfer is signed and broadcast.
 */
type FooterProps = {
  phase: SendPhase;
  draft: SendDraft | null;
  record: LocalTxRecord | null;
};

function Footer({ phase, draft, record }: FooterProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const outcome = useSendFlowStore((state) => state.outcome);
  if (phase === 'sending') return null;
  return (
    <View
      testID="send-result-footer"
      className="gap-3 border-t border-border bg-surface px-6 pt-3"
      style={{ paddingBottom: insets.bottom + FOOTER_BOTTOM_GAP }}
    >
      {phase === 'notSent' ? (
        <Button label={t('send.receipt.tryAgain')} onPress={() => router.dismissTo(ROUTES.send)} />
      ) : null}
      {draft && outcome?.ok ? (
        <ShareButton draft={draft} phase={phase} hash={outcome.hash} record={record} />
      ) : null}
      <Button
        variant={phase === 'notSent' ? 'ghost' : 'primary'}
        label={t('common.done')}
        onPress={finish}
      />
    </View>
  );
}

/**
 * Step 3 of Send: a receipt that follows the real transfer (D-81, D-96). The hero says in one
 * short sentence where the transfer is; the amount and a receipt card follow, and the technical
 * facts are collapsed. Success styling (check mark, success color and haptic) waits for the first
 * confirmation; a transfer that failed, was dropped or replaced, or whose broadcast timed out,
 * says what happened and what to do next.
 */
export function SendStatus() {
  const draft = useSendFlowStore((state) => state.draft);
  const outcome = useSendFlowStore((state) => state.outcome);
  const { phase, record } = useSendPhase();
  usePhaseHaptics(phase);
  useHardwareBack(phase === 'sending');

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        contentContainerClassName="gap-6 px-6 pb-8 pt-6"
        showsVerticalScrollIndicator={false}
      >
        <StatusHero phase={phase} />
        {draft ? <ReceiptAmount draft={draft} /> : null}
        {draft ? <ReceiptCard draft={draft} phase={phase} record={record} /> : null}
        {outcome?.ok ? <ReceiptTechnical hash={outcome.hash} record={record} /> : null}
      </ScrollView>
      <Footer phase={phase} draft={draft} record={record} />
    </View>
  );
}
