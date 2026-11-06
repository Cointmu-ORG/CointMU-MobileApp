import { env } from '@/shared/config';

/** The one place chain identity is defined (architecture §2). Values come from EXPO_PUBLIC_*. */
export const network = {
  name: 'CointMU',
  chainId: env.chainId,
  rpcUrl: env.rpcUrl,
} as const;
