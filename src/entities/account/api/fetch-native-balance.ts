import { getProvider } from '@/entities/network/@x/account';
import { callRpc } from '@/shared/api';

/** Native CMU balance in wei, with timeout and retry. */
export function fetchNativeBalance(address: string): Promise<bigint> {
  return callRpc(() => getProvider().getBalance(address));
}
