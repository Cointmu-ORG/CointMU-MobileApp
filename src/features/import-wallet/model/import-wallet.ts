import {
  addressFromPrivateKey,
  createWalletId,
  deriveAccount,
  findWallet,
  findWalletByAddress,
  isValidMnemonic,
  MAX_WALLETS,
  normalizePhrase,
  normalizePrivateKey,
  saveWalletSecret,
  useWalletStore,
  type WalletSecret,
} from '@/entities/wallet';
import { isSameAddress } from '@/shared/lib';

export type ImportError =
  | 'invalidMnemonic'
  | 'invalidPrivateKey'
  /** The phrase or key belongs to a wallet (or account) that is already here. */
  | 'duplicate'
  | 'limitReached'
  /** Recovery only: the secret is valid but is not the one of the wallet being restored. */
  | 'wrongWallet';

export type ImportResult =
  | { readonly ok: true; readonly walletId: string }
  | { readonly ok: false; readonly error: ImportError };

/** Add a new wallet, or put the secret back for a wallet whose secret became unreadable. */
export type ImportTarget =
  { readonly kind: 'new' } | { readonly kind: 'recover'; readonly walletId: string };

const NEW_WALLET: ImportTarget = { kind: 'new' };

type Candidate = { readonly secret: WalletSecret; readonly address: string };

function source(secret: WalletSecret) {
  return secret.kind === 'mnemonic' ? 'mnemonic' : 'private-key';
}

/** D-39 per wallet: the secret must reproduce the wallet's first address, from the same kind. */
async function restoreSecret(walletId: string, candidate: Candidate): Promise<ImportResult> {
  const wallet = findWallet(walletId);
  const first = wallet?.accounts.find((account) => account.index === 0);
  const isSameWallet =
    wallet !== null &&
    first !== undefined &&
    wallet.source === source(candidate.secret) &&
    isSameAddress(first.address, candidate.address);
  if (!isSameWallet) return { ok: false, error: 'wrongWallet' };
  await saveWalletSecret(walletId, candidate.secret);
  const store = useWalletStore.getState();
  store.setUnreadableWallets(
    store.wallets
      .filter((other) => other.needsRecovery && other.id !== walletId)
      .map((other) => other.id),
  );
  return { ok: true, walletId };
}

/** Duplicate guard and limit (D-78), then the secret goes to SecureStore under a new id. */
async function addWallet(candidate: Candidate): Promise<ImportResult> {
  const { status, wallets } = useWalletStore.getState();
  if (status === 'active') {
    if (findWalletByAddress(candidate.address) !== null) return { ok: false, error: 'duplicate' };
    if (wallets.length >= MAX_WALLETS) return { ok: false, error: 'limitReached' };
  }
  const id = createWalletId();
  await saveWalletSecret(id, candidate.secret);
  useWalletStore.getState().addWallet({
    id,
    source: source(candidate.secret),
    origin: 'imported',
    address: candidate.address,
    addedAt: Date.now(),
  });
  return { ok: true, walletId: id };
}

function store(candidate: Candidate, target: ImportTarget): Promise<ImportResult> {
  return target.kind === 'recover'
    ? restoreSecret(target.walletId, candidate)
    : addWallet(candidate);
}

/**
 * Validates, derives account 0 and stores the phrase in SecureStore. The first wallet then moves
 * on to PIN setup; a later one becomes the active wallet.
 */
export async function importFromMnemonic(
  input: string,
  target: ImportTarget = NEW_WALLET,
): Promise<ImportResult> {
  const phrase = normalizePhrase(input);
  if (!isValidMnemonic(phrase)) return { ok: false, error: 'invalidMnemonic' };
  const { address } = await deriveAccount(phrase);
  return store({ secret: { kind: 'mnemonic', phrase }, address }, target);
}

/** A private-key wallet has no mnemonic and cannot derive more accounts (architecture §5). */
export async function importFromPrivateKey(
  input: string,
  target: ImportTarget = NEW_WALLET,
): Promise<ImportResult> {
  const privateKey = normalizePrivateKey(input);
  if (privateKey === null) return { ok: false, error: 'invalidPrivateKey' };
  const address = addressFromPrivateKey(privateKey);
  return store({ secret: { kind: 'private-key', privateKey }, address }, target);
}
