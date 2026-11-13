import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import {
  DEFAULT_ACCOUNT_ICON,
  resolveAccountIcon,
  useAccount,
  useAccountLabel,
  type WalletRecord,
} from '@/entities/wallet';
import { shortenAddress } from '@/shared/lib';

import {
  personalizeAccount,
  saveWalletDetails,
  setAccountIcon,
  type AccountRef,
} from '../model/accounts';
import { PersonalizeForm } from './personalize-form';

type PersonalizeAccountProps = {
  account: AccountRef;
  /** The step after "Add account": Save is offered without a change. */
  isSetupStep: boolean;
  onDone: () => void;
};

/** Name, color and icon of one account card. */
export function PersonalizeAccount({ account: ref, isSetupStep, onDone }: PersonalizeAccountProps) {
  const { t } = useTranslation();
  const label = useAccountLabel();
  const account = useAccount(ref);
  if (account === null) return null;

  return (
    <PersonalizeForm
      initial={{
        name: account.name ?? '',
        color: account.color,
        icon: resolveAccountIcon(account.icon),
      }}
      nameLabel={t('wallets.personalize.accountName')}
      defaultName={label({ ...account, name: null })}
      detail={shortenAddress(account.address)}
      picksIcon
      isSetupStep={isSetupStep}
      onSave={(look) => {
        personalizeAccount(ref, look);
        onDone();
      }}
    />
  );
}

type PersonalizeWalletProps = {
  wallet: WalletRecord;
  /**
   * The last step of creating or importing the wallet: it also picks the icon of the wallet's
   * first card, and Save is offered without a change.
   */
  isSetupStep: boolean;
  onDone: () => void;
  children?: ReactNode;
};

/**
 * Name and color of a wallet. The color also goes to its cards that still have the wallet's
 * previous color. An empty name keeps the default ("Wallet N").
 */
export function PersonalizeWallet({
  wallet,
  isSetupStep,
  onDone,
  children,
}: PersonalizeWalletProps) {
  const { t } = useTranslation();
  const accountLabel = useAccountLabel();
  const first = wallet.accounts[0];

  return (
    <PersonalizeForm
      initial={{
        name: wallet.name ?? '',
        color: wallet.color,
        icon: resolveAccountIcon(first?.icon, DEFAULT_ACCOUNT_ICON),
      }}
      nameLabel={t('wallets.personalize.walletName')}
      defaultName={t('wallets.defaultName', { number: wallet.number })}
      detail={
        isSetupStep && first
          ? accountLabel(first)
          : t(`wallets.source.${wallet.source}`, { count: wallet.accounts.length })
      }
      picksIcon={isSetupStep}
      isSetupStep={isSetupStep}
      onSave={({ name, color, icon }) => {
        saveWalletDetails(wallet, { name, color });
        if (isSetupStep && first) setAccountIcon({ walletId: wallet.id, index: first.index }, icon);
        onDone();
      }}
    >
      {children}
    </PersonalizeForm>
  );
}
