import * as Clipboard from 'expo-clipboard';
import { getAddress } from 'ethers';
import Copy from 'lucide-react-native/icons/copy';
import Share2 from 'lucide-react-native/icons/share-2';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useAccountLabel, useActiveAccount, useWalletStore } from '@/entities/wallet';
import { logger } from '@/shared/lib';
import { Button, Card, ICON_SIZE, Notice, Text, useTheme } from '@/shared/ui';

const QR_SIZE = 220;
const QR_QUIET_ZONE = 12;
const COPIED_FEEDBACK_MS = 2_000;

function useCopy(address: string) {
  const [isCopied, setIsCopied] = useState(false);
  useEffect(() => {
    if (!isCopied) return;
    const timer = setTimeout(() => setIsCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [isCopied]);
  const copy = async () => {
    try {
      // Public data only: the address here and the build info in About are all Muvo ever copies.
      await Clipboard.setStringAsync(address);
      setIsCopied(true);
    } catch (error) {
      logger.warn('Copying address failed', { error });
    }
  };
  return { isCopied, copy };
}

type ReceiveCardProps = {
  /** Another account to show (from its card in the Wallets tab); the active one when omitted. */
  account?: { readonly walletId: string; readonly index: number };
};

/**
 * An account's address as a QR code (the plain checksummed address, no URI, D-50), with copy
 * and share. A note says which assets belong on this address.
 */
export function ReceiveCard({ account: ref }: ReceiveCardProps) {
  const { colors, scheme } = useTheme();
  const { t } = useTranslation();
  const activeAccount = useActiveAccount();
  const chosen = useWalletStore((state) =>
    ref === undefined
      ? null
      : (state.wallets
          .find((wallet) => wallet.id === ref.walletId)
          ?.accounts.find((candidate) => candidate.index === ref.index) ?? null),
  );
  const account = ref === undefined ? activeAccount : chosen;
  const labelOf = useAccountLabel();
  const address = account ? getAddress(account.address) : '';
  const { isCopied, copy } = useCopy(address);
  if (account === null) return null;

  const share = async () => {
    try {
      await Share.share({ message: address });
    } catch (error) {
      logger.warn('Sharing address failed', { error });
    }
  };

  return (
    <View className="gap-6">
      <Card className="items-center gap-4">
        <Text variant="heading">{labelOf(account)}</Text>
        <View accessible accessibilityRole="image" accessibilityLabel={t('receive.qrLabel')}>
          <QRCode
            value={address}
            size={QR_SIZE}
            quietZone={QR_QUIET_ZONE}
            // Always dark modules on white: many scanners cannot read an inverted code.
            color={scheme === 'dark' ? colors.surface.DEFAULT : colors.content.DEFAULT}
            backgroundColor={colors.content.inverse}
            ecl="M"
          />
        </View>
        <Text variant="mono" className="text-center" selectable>
          {address}
        </Text>
      </Card>
      <View className="gap-3">
        <Button
          label={isCopied ? t('receive.copied') : t('receive.copy')}
          onPress={() => void copy()}
          icon={<Copy size={ICON_SIZE.md} color={colors.content.inverse} />}
        />
        <Button
          variant="secondary"
          label={t('receive.share')}
          onPress={() => void share()}
          icon={<Share2 size={ICON_SIZE.md} color={colors.accent.DEFAULT} />}
        />
      </View>
      <Notice tone="info">{t('receive.note')}</Notice>
    </View>
  );
}
