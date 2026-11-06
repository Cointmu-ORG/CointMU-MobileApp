/** Public, non-secret runtime config. Every EXPO_PUBLIC_* value ships inside the app bundle. */
export type Env = {
  readonly rpcUrl: string;
  readonly chainId: number;
};

type EnvSource = Readonly<Record<string, string | undefined>>;

const ALLOWED_RPC_PROTOCOLS: readonly string[] = ['http:', 'https:'];

function requireVar(source: EnvSource, name: string): string {
  const value = source[name]?.trim();
  if (!value) {
    throw new Error(`Missing env var ${name}. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

/** Validates env vars once at startup and fails fast with the variable name. */
export function readEnv(source: EnvSource): Env {
  const rpcUrl = requireVar(source, 'EXPO_PUBLIC_RPC_URL');
  if (!ALLOWED_RPC_PROTOCOLS.some((protocol) => rpcUrl.startsWith(`${protocol}//`))) {
    throw new Error('EXPO_PUBLIC_RPC_URL must be an http(s) URL.');
  }
  const chainId = Number(requireVar(source, 'EXPO_PUBLIC_CHAIN_ID'));
  if (!Number.isSafeInteger(chainId) || chainId <= 0) {
    throw new Error('EXPO_PUBLIC_CHAIN_ID must be a positive integer.');
  }
  return { rpcUrl, chainId };
}

// Expo only inlines EXPO_PUBLIC_* when accessed as literal `process.env.NAME`.
export const env: Env = readEnv({
  EXPO_PUBLIC_RPC_URL: process.env.EXPO_PUBLIC_RPC_URL,
  EXPO_PUBLIC_CHAIN_ID: process.env.EXPO_PUBLIC_CHAIN_ID,
});
