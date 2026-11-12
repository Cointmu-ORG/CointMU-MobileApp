import { hexlify, randomBytes } from 'ethers';

import { logger, secureStorage } from '@/shared/lib';

import { LEGACY_WALLET_ID, WALLET_ID_BYTES } from '../config/wallet-config';

/** A wallet's root secret. Lives only in SecureStore (architecture §5). */
export type WalletSecret =
  | { readonly kind: 'mnemonic'; readonly phrase: string }
  | { readonly kind: 'private-key'; readonly privateKey: string };

/**
 * SecureStore layout (D-79):
 * - `muvo.wallet.secret.<id>`: one secret per wallet, keyed by its random id.
 * - `muvo.wallet.secret`: the secret of the pre-multi-wallet install (wallet id `legacy`).
 * - `muvo.wallet.ids`: the ids that may hold a secret. SecureStore cannot list its keys and the
 *   wallet metadata lives in AsyncStorage, which a reinstall loses, so this index is what lets a
 *   wipe find every secret. An id is added before its secret is written and removed after the
 *   secret is deleted: the index is always a superset of the stored secrets.
 */
const LEGACY_SECRET_KEY = 'muvo.wallet.secret';
const SECRET_KEY_PREFIX = 'muvo.wallet.secret.';
const INDEX_KEY = 'muvo.wallet.ids';
const WALLET_ID_PATTERN = /^[0-9a-f]+$/;
const HEX_PREFIX_LENGTH = 2;

/** A new random wallet id: lowercase hex, safe as part of a SecureStore key. */
export function createWalletId(): string {
  return hexlify(randomBytes(WALLET_ID_BYTES)).slice(HEX_PREFIX_LENGTH);
}

function isWalletId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length === WALLET_ID_BYTES * 2 &&
    WALLET_ID_PATTERN.test(value)
  );
}

function secretKey(walletId: string): string {
  if (walletId === LEGACY_WALLET_ID) return LEGACY_SECRET_KEY;
  if (!isWalletId(walletId)) throw new Error('Malformed wallet id');
  return `${SECRET_KEY_PREFIX}${walletId}`;
}

function isWalletSecret(value: unknown): value is WalletSecret {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  if (record.kind === 'mnemonic') return typeof record.phrase === 'string';
  if (record.kind === 'private-key') return typeof record.privateKey === 'string';
  return false;
}

/** Ids in the index. A missing or malformed index reads as empty. */
async function readIndex(): Promise<string[]> {
  const raw = await secureStorage.get(INDEX_KEY);
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isWalletId) : [];
  } catch (error) {
    logger.warn('Wallet id index is unreadable', { error });
    return [];
  }
}

// Index updates are read-modify-write; this chain runs them one at a time.
let indexQueue: Promise<unknown> = Promise.resolve();

function updateIndex(change: (ids: string[]) => string[]): Promise<void> {
  const run = indexQueue.then(async () => {
    const next = change(await readIndex());
    if (next.length === 0) await secureStorage.remove(INDEX_KEY);
    else await secureStorage.set(INDEX_KEY, JSON.stringify(next));
  });
  indexQueue = run.catch(() => undefined);
  return run;
}

/** Stores a wallet's secret. The id enters the index first (see the layout note above). */
export async function saveWalletSecret(walletId: string, secret: WalletSecret): Promise<void> {
  const key = secretKey(walletId);
  if (walletId !== LEGACY_WALLET_ID) {
    await updateIndex((ids) => (ids.includes(walletId) ? ids : [...ids, walletId]));
  }
  await secureStorage.set(key, JSON.stringify(secret));
}

/** Read only right before use (reveal, signing) and drop the reference afterwards. */
export async function readWalletSecret(walletId: string): Promise<WalletSecret | null> {
  const raw = await secureStorage.get(secretKey(walletId));
  if (raw === null) return null;
  const parsed: unknown = JSON.parse(raw);
  if (!isWalletSecret(parsed)) {
    // The message never includes the stored value.
    throw new Error('A stored wallet secret has an unexpected shape');
  }
  return parsed;
}

/**
 * True when a well-formed secret is stored for the wallet. Used by the startup integrity check
 * (D-39); the parsed value never leaves this function. Read or parse failures count as
 * unreadable.
 */
export async function hasReadableWalletSecret(walletId: string): Promise<boolean> {
  try {
    return (await readWalletSecret(walletId)) !== null;
  } catch {
    return false;
  }
}

/** Deletes one wallet's secret, then drops its id from the index. */
export async function deleteWalletSecret(walletId: string): Promise<void> {
  await secureStorage.remove(secretKey(walletId));
  if (walletId !== LEGACY_WALLET_ID) {
    await updateIndex((ids) => ids.filter((id) => id !== walletId));
  }
}

/**
 * Deletes every wallet secret: the legacy key, every indexed id and any id the caller still
 * knows from the wallet metadata (covers a damaged index). The index goes last.
 */
export async function deleteAllWalletSecrets(knownIds: readonly string[] = []): Promise<void> {
  const ids = new Set([...(await readIndex()), ...knownIds.filter(isWalletId)]);
  await Promise.all([
    secureStorage.remove(LEGACY_SECRET_KEY),
    ...[...ids].map((id) => secureStorage.remove(secretKey(id))),
  ]);
  await updateIndex(() => []);
}
