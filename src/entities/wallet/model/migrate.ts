import { cardColorAt } from '@/shared/ui';

import { LEGACY_WALLET_ID } from '../config/wallet-config';
import type { WalletAccount, WalletRecord, WalletSource } from './types';

export const WALLET_PERSIST_VERSION = 2;
const ACCOUNT_LIST_VERSION = 1;

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
  const colored: WalletAccount[] = accounts.map((account, position) => ({
    index: account.index,
    address: account.address,
    name: typeof account.name === 'string' ? account.name : null,
    color: cardColorAt(position),
  }));
  const wallet: WalletRecord = {
    id: LEGACY_WALLET_ID,
    number: 1,
    name: null,
    color: cardColorAt(0),
    source: v1.source,
    origin: v1.source === 'private-key' ? 'imported' : null,
    addedAt: null,
    isBackupPending: v1.status === 'pendingBackup',
    needsRecovery: false,
    accounts: colored,
  };
  return { ...rest, wallets: [wallet], activeWalletId: LEGACY_WALLET_ID };
}

/** Brings a persisted wallet store of any older version up to the current shape. */
export function migrateWalletState(persisted: unknown, version: number): unknown {
  if (version >= WALLET_PERSIST_VERSION || typeof persisted !== 'object' || persisted === null) {
    return persisted;
  }
  const v1 = version < ACCOUNT_LIST_VERSION ? toAccountList(persisted as Persisted) : persisted;
  return toWalletList(v1 as Persisted);
}
