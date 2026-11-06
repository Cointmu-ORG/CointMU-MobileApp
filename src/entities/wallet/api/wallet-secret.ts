import { secureStorage } from '@/shared/lib';

/** The wallet's root secret. Lives only in SecureStore (architecture §5). */
export type WalletSecret =
  | { readonly kind: 'mnemonic'; readonly phrase: string }
  | { readonly kind: 'private-key'; readonly privateKey: string };

const SECRET_KEY = 'muvo.wallet.secret';

function isWalletSecret(value: unknown): value is WalletSecret {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  if (record.kind === 'mnemonic') return typeof record.phrase === 'string';
  if (record.kind === 'private-key') return typeof record.privateKey === 'string';
  return false;
}

export function saveWalletSecret(secret: WalletSecret): Promise<void> {
  return secureStorage.set(SECRET_KEY, JSON.stringify(secret));
}

/** Read only right before use (reveal, signing) and drop the reference afterwards. */
export async function readWalletSecret(): Promise<WalletSecret | null> {
  const raw = await secureStorage.get(SECRET_KEY);
  if (raw === null) return null;
  const parsed: unknown = JSON.parse(raw);
  if (!isWalletSecret(parsed)) {
    // The message never includes the stored value.
    throw new Error(`SecureStore item ${SECRET_KEY} has an unexpected shape`);
  }
  return parsed;
}

export function deleteWalletSecret(): Promise<void> {
  return secureStorage.remove(SECRET_KEY);
}
