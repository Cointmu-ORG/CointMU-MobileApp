import {
  createWalletId,
  deriveAccount,
  generateMnemonic,
  MAX_WALLETS,
  saveWalletSecret,
  useWalletStore,
} from '@/entities/wallet';

/** Thrown when the app already holds `MAX_WALLETS` wallets. */
export class WalletLimitError extends Error {
  constructor() {
    super('The wallet limit is reached');
    this.name = 'WalletLimitError';
  }
}

/**
 * Generates a mnemonic, derives account 0 and stores the phrase in SecureStore right away under
 * a new wallet id (D-32, D-79). The wallet is added with its backup pending: the first wallet
 * moves onboarding to the backup step, a later one waits in the Wallets tab until its quiz is
 * passed. A killed app resumes at the backup step either way. Returns the wallet id.
 */
export async function createWallet(): Promise<string> {
  const { status, wallets } = useWalletStore.getState();
  if (status === 'active' && wallets.length >= MAX_WALLETS) throw new WalletLimitError();
  const phrase = generateMnemonic();
  const { address } = await deriveAccount(phrase);
  const id = createWalletId();
  await saveWalletSecret(id, { kind: 'mnemonic', phrase });
  useWalletStore
    .getState()
    .addWallet({ id, source: 'mnemonic', origin: 'created', address, addedAt: Date.now() });
  return id;
}
