import { isHttpUrl, readEnv } from './env';

const CHAIN = { EXPO_PUBLIC_CHAIN_ID: '1912' };

describe('readEnv', () => {
  it('reads a comma-separated node list, trimmed and without duplicates', () => {
    const env = readEnv({
      ...CHAIN,
      EXPO_PUBLIC_RPC_URLS: ' https://a.invalid , http://b.invalid:8545,,https://a.invalid',
    });
    expect(env).toEqual({ rpcUrls: ['https://a.invalid', 'http://b.invalid:8545'], chainId: 1912 });
  });

  it('fails fast on a missing list or a non-http entry', () => {
    expect(() => readEnv(CHAIN)).toThrow('EXPO_PUBLIC_RPC_URLS');
    expect(() => readEnv({ ...CHAIN, EXPO_PUBLIC_RPC_URLS: 'https://a.invalid,ftp://b' })).toThrow(
      'comma-separated list',
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
