import { cardColorAt } from '@/shared/ui';

import { LEGACY_WALLET_ID } from '../config/wallet-config';
import { defaultAccountIcon, resolveAccountIcon } from '../lib/account-icon';
import type { WalletAccount, WalletRecord, WalletSource } from './types';

export const WALLET_PERSIST_VERSION = 3;
const ACCOUNT_LIST_VERSION = 1;
const WALLET_LIST_VERSION = 2;

type Persisted = Record<string, unknown>;
type V1Account = { index: number; address: string; name: string | null };

function isV1Account(value: unknown): value is V1Account {
  if (typeof value !== 'object' || value === null) return false;
  const account = value as Persisted;
  return typeof account.index === 'number' && typeof account.address === 'string';
}

/** v0 stored one address and its index; v1 keeps a list of accounts. */
function toAccountList(v0: Persisted): Persisted {
  const index = typeof v0.accountIndex === 'number' ? v0.accountIndex : 0;
  const accounts =
    typeof v0.address === 'string' ? [{ index, address: v0.address, name: null }] : [];
  return { ...v0, accounts };
}

function isSource(value: unknown): value is WalletSource {
  return value === 'mnemonic' || value === 'private-key';
}

/**
 * v1 held one wallet; v2 holds a list (D-78). The existing wallet becomes wallet 1 under the
 * fixed id `legacy`, whose secret stays where it always was (D-79). Nothing here is random or
 * reads storage, so running it again on the same input gives the same result: a crash before
 * the migrated state is written back simply repeats it.
 */
function toWalletList(v1: Persisted): Persisted {
  const accounts = Array.isArray(v1.accounts) ? v1.accounts.filter(isV1Account) : [];
  const { accounts: _accounts, ...rest } = v1;
  if (v1.status === 'none' || !isSource(v1.source) || accounts.length === 0) {
    return { ...rest, wallets: [], activeWalletId: null };
  }
  const source = v1.source;
  const colored: WalletAccount[] = accounts.map((account, position) => ({
    index: account.index,
    address: account.address,
    name: typeof account.name === 'string' ? account.name : null,
    color: cardColorAt(position),
    icon: defaultAccountIcon(source),
  }));
  const wallet: WalletRecord = {
    id: LEGACY_WALLET_ID,
    number: 1,
    name: null,
    color: cardColorAt(0),
    source,
    origin: source === 'private-key' ? 'imported' : null,
    addedAt: null,
    isBackupPending: v1.status === 'pendingBackup',
    needsRecovery: false,
    accounts: colored,
  };
  return { ...rest, wallets: [wallet], activeWalletId: LEGACY_WALLET_ID };
}

/**
 * v2 accounts had no icon; v3 gives each one (D-84). An account keeps everything it had (name,
 * color, address) and gets the icon its card already showed: the key for a private-key wallet,
 * the wallet otherwise. Pure and repeatable like the step before it.
 */
function withAccountIcons(v2: Persisted): Persisted {
  if (!Array.isArray(v2.wallets)) return v2;
  const wallets = v2.wallets.map((wallet: unknown) => {
    if (typeof wallet !== 'object' || wallet === null) return wallet;
    const record = wallet as Persisted;
    if (!Array.isArray(record.accounts)) return record;
    const fallback = defaultAccountIcon(isSource(record.source) ? record.source : 'mnemonic');
    const accounts = record.accounts.map((account: unknown) =>
      typeof account === 'object' && account !== null
        ? { ...account, icon: resolveAccountIcon((account as Persisted).icon, fallback) }
        : account,
    );
    return { ...record, accounts };
  });
  return { ...v2, wallets };
}

/** Brings a persisted wallet store of any older version up to the current shape. */
export function migrateWalletState(persisted: unknown, version: number): unknown {
  if (version >= WALLET_PERSIST_VERSION || typeof persisted !== 'object' || persisted === null) {
    return persisted;
  }
  const v1 = version < ACCOUNT_LIST_VERSION ? toAccountList(persisted as Persisted) : persisted;
  const v2 = version < WALLET_LIST_VERSION ? toWalletList(v1 as Persisted) : (v1 as Persisted);
  return withAccountIcons(v2);
}
