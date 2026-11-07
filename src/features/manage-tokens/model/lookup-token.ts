import { getAssetKey, readTokenMetadata, type Erc20Asset } from '@/entities/asset';
import { getProvider } from '@/entities/network';
import { checkAddress } from '@/shared/lib';

export type TokenLookupError =
  'invalidAddress' | 'badChecksum' | 'alreadyAdded' | 'notContract' | 'notToken';

export type TokenLookupResult =
  | { readonly ok: true; readonly token: Erc20Asset }
  | { readonly ok: false; readonly error: TokenLookupError };

/**
 * Validates the address and reads the contract's metadata. Nothing is saved here: the user
 * confirms the preview, after the "unverified token" warning, before the token is added.
 * Throws RpcUnavailableError when the node cannot be reached.
 */
export async function lookupToken(
  input: string,
  known: readonly Erc20Asset[],
): Promise<TokenLookupResult> {
  const check = checkAddress(input);
  if (!check.ok) {
    return { ok: false, error: check.error === 'invalid' ? 'invalidAddress' : 'badChecksum' };
  }
  const key = check.address.toLowerCase();
  if (known.some((token) => getAssetKey(token) === key))
    return { ok: false, error: 'alreadyAdded' };
  return readTokenMetadata(getProvider(), check.address);
}
