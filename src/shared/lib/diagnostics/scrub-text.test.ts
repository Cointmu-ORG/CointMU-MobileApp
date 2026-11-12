import { REDACTED, scrubFilename, scrubText } from './scrub-text';

// Public test vectors only: the Hardhat phrase and account #0, and the BIP-39 "abandon" phrase.
const PHRASE_12 = 'test test test test test test test test test test test junk';
const PHRASE_24 =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';
const PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const TX_HASH = '0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060';
const PIN = '135790';

describe('scrubText', () => {
  it.each([
    ['a 12-word phrase', `import failed: ${PHRASE_12}.`, `import failed: ${REDACTED.phrase}.`],
    ['a 24-word phrase', `phrase: ${PHRASE_24}`, `phrase: ${REDACTED.phrase}`],
    [
      'a phrase in upper case with line breaks',
      PHRASE_12.toUpperCase().split(' ').join('\n'),
      REDACTED.phrase,
    ],
    ['a phrase as a JSON array', JSON.stringify(PHRASE_12.split(' ')), `["${REDACTED.phrase}"]`],
    ['a phrase with a typo in it', PHRASE_12.replace('test junk', 'tset junk'), REDACTED.phrase],
    ['a private key', `key ${PRIVATE_KEY} rejected`, `key ${REDACTED.hex} rejected`],
    ['a private key without 0x', PRIVATE_KEY.slice(2), REDACTED.hex],
    ['a transaction hash', `tx ${TX_HASH} dropped`, `tx ${REDACTED.hex} dropped`],
    ['a signed transaction', `raw 0x02f8${'ab'.repeat(120)}`, `raw ${REDACTED.hex}`],
    ['a wallet address', `balance of ${ADDRESS} failed`, 'balance of 0x…redacted failed'],
    ['a lower-case address', ADDRESS.toLowerCase(), '0x…redacted'],
    ['an address without 0x', `to=${ADDRESS.slice(2)}`, 'to=0x…redacted'],
    ['a PIN next to its name', `wrong pin: ${PIN}`, `wrong pin: ${REDACTED.value}`],
    ['a PIN in a JSON string', `{"pin":"${PIN}"}`, `{"pin":"${REDACTED.value}"}`],
    ['a bare six-digit number', `entered ${PIN} twice`, `entered ${REDACTED.digits} twice`],
    [
      'an RPC URL with credentials',
      'POST https://alice:s3cret@rpc.example.invalid:8545/v3/apikey?token=abc failed',
      `POST https://rpc.example.invalid:8545${REDACTED.path} failed`,
    ],
    [
      'an RPC URL with an API key in the path',
      'http://10.64.24.101:8585/key/0123abcd',
      `http://10.64.24.101:8585${REDACTED.path}`,
    ],
  ])('removes %s', (_name, input, expected) => {
    expect(scrubText(input)).toBe(expected);
  });

  it.each([
    ['a plain RPC URL', 'http://10.64.24.101:8585'],
    ['an ordinary sentence', 'Fresh-install check failed: the storage is not available'],
    ['a short hex value', 'chain id 0x778, nonce 12, gas 21000'],
    ['a few BIP-39 words in a row', 'unable to open the camera again'],
    ['a longer number', 'timestamp 1794384550123'],
  ])('keeps %s', (_name, input) => {
    expect(scrubText(input)).toBe(input);
  });

  it('removes every secret from one message', () => {
    const scrubbed = scrubText(
      `send from ${ADDRESS} key ${PRIVATE_KEY} tx ${TX_HASH} pin ${PIN} phrase ${PHRASE_12}`,
    );
    for (const secret of [ADDRESS, ADDRESS.slice(2), PRIVATE_KEY.slice(2), TX_HASH, PIN, 'junk']) {
      expect(scrubbed).not.toContain(secret);
    }
  });
});

describe('scrubFilename', () => {
  it('keeps the bundle path of a dev-server URL and drops its query and credentials', () => {
    expect(
      scrubFilename('http://user:pw@192.168.1.20:8081/index.ts.bundle?platform=ios&dev=true'),
    ).toBe('http://192.168.1.20:8081/index.ts.bundle');
  });

  it('keeps a release bundle path', () => {
    expect(scrubFilename('app:///main.jsbundle')).toBe('app:///main.jsbundle');
  });

  it('still removes secrets', () => {
    expect(scrubFilename(`/data/${ADDRESS}/index.js`)).toBe('/data/0x…redacted/index.js');
  });
});
