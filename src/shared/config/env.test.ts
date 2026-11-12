import { explorerTxUrl, isCleartextAllowed, isHttpUrl, readEnv } from './env';

const CHAIN = { EXPO_PUBLIC_CHAIN_ID: '1912' };

describe('readEnv', () => {
  it('reads a comma-separated node list, trimmed and without duplicates', () => {
    const env = readEnv({
      ...CHAIN,
      EXPO_PUBLIC_RPC_URLS: ' https://a.invalid , http://b.invalid:8545,,https://a.invalid',
    });
    expect(env).toEqual({
      rpcUrls: ['https://a.invalid', 'http://b.invalid:8545'],
      chainId: 1912,
      explorerUrl: null,
      glitchtipDsn: null,
    });
  });

  it('fails fast on a missing list or a non-http entry', () => {
    expect(() => readEnv(CHAIN)).toThrow('EXPO_PUBLIC_RPC_URLS');
    expect(() => readEnv({ ...CHAIN, EXPO_PUBLIC_RPC_URLS: 'https://a.invalid,ftp://b' })).toThrow(
      'comma-separated list',
    );
  });
});

describe('explorer URL (Q-27)', () => {
  const NODES = { ...CHAIN, EXPO_PUBLIC_RPC_URLS: 'https://a.invalid' };

  it('is optional and builds tx links without a double slash', () => {
    const env = readEnv({ ...NODES, EXPO_PUBLIC_EXPLORER_URL: 'https://scan.example.invalid/' });
    expect(explorerTxUrl('0xabc', env.explorerUrl)).toBe('https://scan.example.invalid/tx/0xabc');
    expect(explorerTxUrl('0xabc', null)).toBeNull();
  });

  it('rejects a non-http explorer URL', () => {
    expect(() => readEnv({ ...NODES, EXPO_PUBLIC_EXPLORER_URL: 'javascript:alert(1)' })).toThrow(
      'EXPO_PUBLIC_EXPLORER_URL',
    );
  });
});

describe('isHttpUrl', () => {
  it.each([
    ['https://rpc.example.invalid', true],
    ['http://10.0.0.1:8545/path', true],
    ['ftp://rpc.example.invalid', false],
    ['rpc.example.invalid', false],
    ['https://', false],
  ])('%s → %s', (value, expected) => {
    expect(isHttpUrl(value)).toBe(expected);
  });
});

describe('isCleartextAllowed', () => {
  const permitted = ['http://10.0.0.1:8545', 'https://rpc.example.invalid', null];

  it.each([
    ['https://anything.example.invalid', true],
    ['http://10.0.0.1:8545', true],
    // The Android rule is per host: another port on a permitted host passes.
    ['http://10.0.0.1:9000', true],
    ['http://10.0.0.2:8545', false],
    // Permitted over https only, so http:// to it is still blocked.
    ['http://rpc.example.invalid', false],
  ])('%s → %s', (value, expected) => {
    expect(isCleartextAllowed(value, permitted)).toBe(expected);
  });
});
