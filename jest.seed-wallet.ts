import {
  createWalletId,
  saveWalletSecret,
  useWalletStore,
  type WalletOrigin,
  type WalletSecret,
  type WalletSource,
} from './src/entities/wallet';

type SeedRecord = {
  readonly source: WalletSource;
  /** Address of account 0. */
  readonly address: string;
  /** Imported by default; `created` leaves the backup pending. */
  readonly origin?: WalletOrigin;
};

type SeedWallet = Omit<SeedRecord, 'source'> & { readonly secret: WalletSecret };

/**
 * Test fixture: adds a wallet record to the store next to the ones already there, without a
 * secret, and returns its id. The first wallet starts onboarding.
 */
export function addWalletRecord({ source, address, origin = 'imported' }: SeedRecord): string {
  const id = createWalletId();
  useWalletStore.getState().addWallet({ id, source, origin, address, addedAt: 0 });
  return id;
}

/** `addWalletRecord` on an emptied store: the wallet is the only one. */
export function seedWalletRecord(record: SeedRecord): string {
  useWalletStore.getState().reset();
  return addWalletRecord(record);
}

/** Adds a wallet the way the app does: the secret in the SecureStore mock, then the record. */
export async function addWallet({ secret, ...record }: SeedWallet): Promise<string> {
  const id = createWalletId();
  await saveWalletSecret(id, secret);
  const source = secret.kind === 'mnemonic' ? 'mnemonic' : 'private-key';
  useWalletStore.getState().addWallet({
    id,
    source,
    origin: record.origin ?? 'imported',
    address: record.address,
    addedAt: 0,
  });
  return id;
}

/** `addWallet` on an emptied store: the wallet is the only one. */
export function seedWallet(wallet: SeedWallet): Promise<string> {
  useWalletStore.getState().reset();
  return addWallet(wallet);
}
