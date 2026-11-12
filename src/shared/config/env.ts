/** Public, non-secret runtime config. Every EXPO_PUBLIC_* value ships inside the app bundle. */
export type Env = {
  /** Preset CointMU RPC nodes, in the order they are offered. The first is the default. */
  readonly rpcUrls: readonly string[];
  readonly chainId: number;
  /** Block explorer base URL for tx links (Q-27); null hides the links. */
  readonly explorerUrl: string | null;
  /**
   * GlitchTip DSN for error reports (D-77); null turns reporting off. Kept as written: error
   * reporting validates it, and a bad value must switch reporting off, never stop the app.
   */
  readonly glitchtipDsn: string | null;
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

/** True for an absolute http(s) URL with a host. Used for preset and user-added RPC nodes. */
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ALLOWED_RPC_PROTOCOLS.includes(url.protocol) && url.hostname !== '';
  } catch {
    return false;
  }
}

function parseRpcUrls(raw: string): string[] {
  const urls = [
    ...new Set(
      raw
        .split(',')
        .map((url) => url.trim())
        .filter(Boolean),
    ),
  ];
  const invalid = urls.find((url) => !isHttpUrl(url));
  if (invalid !== undefined || urls.length === 0) {
    throw new Error('EXPO_PUBLIC_RPC_URLS must be a comma-separated list of http(s) URLs.');
  }
  return urls;
}

/** Validates env vars once at startup and fails fast with the variable name. */
export function readEnv(source: EnvSource): Env {
  const rpcUrls = parseRpcUrls(requireVar(source, 'EXPO_PUBLIC_RPC_URLS'));
  const chainId = Number(requireVar(source, 'EXPO_PUBLIC_CHAIN_ID'));
  if (!Number.isSafeInteger(chainId) || chainId <= 0) {
    throw new Error('EXPO_PUBLIC_CHAIN_ID must be a positive integer.');
  }
  return {
    rpcUrls,
    chainId,
    explorerUrl: parseExplorerUrl(source.EXPO_PUBLIC_EXPLORER_URL),
    glitchtipDsn: source.EXPO_PUBLIC_GLITCHTIP_DSN?.trim() || null,
  };
}

function parseExplorerUrl(raw: string | undefined): string | null {
  const value = raw?.trim().replace(/\/+$/, '');
  if (!value) return null;
  if (!isHttpUrl(value)) throw new Error('EXPO_PUBLIC_EXPLORER_URL must be an http(s) URL.');
  return value;
}

/** Explorer page for a tx hash, or null when no explorer is configured. */
export function explorerTxUrl(hash: string, explorerUrl: string | null = env.explorerUrl) {
  return explorerUrl === null ? null : `${explorerUrl}/tx/${hash}`;
}

// Expo only inlines EXPO_PUBLIC_* when accessed as literal `process.env.NAME`.
export const env: Env = readEnv({
  EXPO_PUBLIC_RPC_URLS: process.env.EXPO_PUBLIC_RPC_URLS,
  EXPO_PUBLIC_CHAIN_ID: process.env.EXPO_PUBLIC_CHAIN_ID,
  EXPO_PUBLIC_EXPLORER_URL: process.env.EXPO_PUBLIC_EXPLORER_URL,
  EXPO_PUBLIC_GLITCHTIP_DSN: process.env.EXPO_PUBLIC_GLITCHTIP_DSN,
});
