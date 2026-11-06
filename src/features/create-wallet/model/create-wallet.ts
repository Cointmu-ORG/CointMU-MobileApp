import {
  deriveAccount,
  generateMnemonic,
  saveWalletSecret,
  useWalletStore,
} from '@/entities/wallet';

/**
 * Generates a mnemonic, derives account 0 and stores the phrase in SecureStore right away with
 * status pendingBackup (D-32), so a killed app resumes at the backup step.
 */
export async function createWallet(): Promise<void> {
  const phrase = generateMnemonic();
  const { address } = await deriveAccount(phrase);
  await saveWalletSecret({ kind: 'mnemonic', phrase });
  useWalletStore.getState().startBackup(address);
}
