import type { Breadcrumb, ErrorEvent } from '@sentry/core';

import { scrubBreadcrumb, scrubData, scrubEvent } from './scrub-event';

// Public test vectors only (Hardhat phrase and account #0).
const PHRASE = 'test test test test test test test test test test test junk';
const PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const TX_HASH = '0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060';
const PIN = '135790';
const RPC_URL = 'https://alice:s3cret@rpc.example.invalid/v3/apikey';
const SECRETS = [
  PHRASE,
  'junk',
  PRIVATE_KEY.slice(2),
  ADDRESS.slice(2),
  ADDRESS.slice(2).toLowerCase(),
  TX_HASH.slice(2),
  PIN,
  's3cret',
  'apikey',
];

function expectNoSecrets(value: unknown): void {
  const text = JSON.stringify(value);
  for (const secret of SECRETS) expect(text).not.toContain(secret);
}

describe('scrubData', () => {
  it.each([
    ['pin', PIN],
    ['newPin', PIN],
    ['PIN_CODE', 123456],
    ['mnemonic', PHRASE],
    ['recoveryPhrase', PHRASE.split(' ')],
    ['seed', 'anything'],
    ['privateKey', PRIVATE_KEY],
    ['secret', { nested: 'value' }],
    ['password', 'hunter2'],
    ['passcode', PIN],
    ['clipboard', ADDRESS],
    ['pastedText', 'whatever was on the clipboard'],
    ['signature', '0x1b'],
    ['signedTx', '0x02f8'],
  ])('drops the value of a field named %s', (key, value) => {
    expect(scrubData({ [key]: value, attempt: 3 })).toEqual({ [key]: '[redacted]', attempt: 3 });
  });

  it('scrubs strings in nested objects and arrays', () => {
    const scrubbed = scrubData({
      tx: { hash: TX_HASH, from: ADDRESS, to: [ADDRESS.toLowerCase()], node: RPC_URL },
      steps: [{ note: `entered ${PIN}` }, { words: PHRASE }],
      error: new Error(`rejected key ${PRIVATE_KEY}`),
      amount: 10n ** 18n,
      attempt: 2,
      isRetry: false,
      missing: null,
    });
    expectNoSecrets(scrubbed);
    expect(scrubbed).toMatchObject({
      tx: {
        hash: '[redacted:hex]',
        from: '0x…redacted',
        to: ['0x…redacted'],
        node: 'https://rpc.example.invalid/…',
      },
      error: 'Error: rejected key [redacted:hex]',
      amount: '1000000000000000000',
      attempt: 2,
      isRetry: false,
      missing: null,
    });
  });

  it('scrubs a secret used as a key, and drops what is not data', () => {
    expect(scrubData({ [ADDRESS]: 1, callback: () => PIN })).toEqual({ '0x…redacted': 1 });
  });

  it('stops at a fixed depth, so a cycle cannot hang it', () => {
    const cycle: Record<string, unknown> = { address: ADDRESS };
    cycle.self = cycle;
    const scrubbed = scrubData(cycle);
    expectNoSecrets(scrubbed);
    expect(JSON.stringify(scrubbed)).toContain('[truncated]');
  });
});

describe('scrubBreadcrumb', () => {
  it.each(['console', 'fetch', 'xhr', 'touch', 'ui.click', 'http', 'clipboard', undefined])(
    'drops a %s breadcrumb',
    (category) => {
      expect(scrubBreadcrumb({ category, message: `pasted ${ADDRESS}` })).toBeNull();
    },
  );

  it('keeps a log line from our logger, scrubbed all the way down', () => {
    const crumb = scrubBreadcrumb({
      category: 'log',
      level: 'warning',
      timestamp: 1,
      message: `Balance of ${ADDRESS} failed`,
      data: { url: RPC_URL, pin: PIN, tx: { hash: TX_HASH } },
    });
    expectNoSecrets(crumb);
    expect(crumb).toEqual({
      category: 'log',
      level: 'warning',
      timestamp: 1,
      message: 'Balance of 0x…redacted failed',
      data: {
        url: 'https://rpc.example.invalid/…',
        pin: '[redacted]',
        tx: { hash: '[redacted:hex]' },
      },
    });
  });

  it('keeps only the route pattern of a navigation breadcrumb: no params, no data', () => {
    const crumb = scrubBreadcrumb({
      category: 'navigation',
      timestamp: 2,
      message: `/tx/[hash]?hash=${TX_HASH}&from=send`,
      data: { from: '/send', to: `/tx/${TX_HASH}`, params: { hash: TX_HASH } },
    });
    expect(crumb).toEqual({
      category: 'navigation',
      level: undefined,
      timestamp: 2,
      message: '/tx/[hash]',
    });
  });

  it('scrubs a route that was given as a real URL anyway', () => {
    const crumb = scrubBreadcrumb({ category: 'navigation', message: `/tx/${TX_HASH}` });
    expect(crumb?.message).toBe('/tx/[redacted:hex]');
  });
});

describe('scrubEvent', () => {
  const event: ErrorEvent = {
    type: undefined,
    event_id: 'abc',
    timestamp: 10,
    level: 'error',
    platform: 'javascript',
    release: 'muvo@1.1.0+0123456',
    dist: '42',
    environment: 'dev',
    sdk: { name: 'sentry.javascript.react-native', version: '8.28.0', packages: [] },
    message: `Send to ${ADDRESS} failed`,
    exception: {
      values: [
        {
          type: 'Error',
          value: `invalid mnemonic: ${PHRASE}. Key: ${PRIVATE_KEY}; tx ${TX_HASH}; pin ${PIN}`,
          mechanism: { type: 'generic', handled: true, data: { address: ADDRESS } },
          stacktrace: {
            frames: [
              {
                filename: 'http://192.168.1.20:8081/index.ts.bundle?platform=ios&dev=true',
                function: 'signWithSecret',
                lineno: 12,
                colno: 3,
                in_app: true,
                vars: { privateKey: PRIVATE_KEY },
                context_line: `const pin = '${PIN}'`,
              },
            ],
          },
        },
      ],
    },
    user: { id: ADDRESS, ip_address: '10.64.24.7' },
    request: { url: RPC_URL, headers: { authorization: 'Bearer s3cret' } },
    extra: { clipboard: PHRASE, params: { hash: TX_HASH } },
    tags: { account: ADDRESS },
    server_name: 'naomi-phone',
    contexts: {
      os: { name: 'iOS', version: '18.1', kernel_version: 'Darwin' },
      app: { app_version: '1.1.0', app_build: '42', device_app_hash: 'abc' },
      device: { model: 'iPhone15,2', name: "Naomi's iPhone", id: 'device-id' },
      wallet: { address: ADDRESS },
    },
    breadcrumbs: [
      { category: 'console', message: `pin ${PIN}` },
      { category: 'log', message: `Reading ${ADDRESS}`, data: { clipboard: PHRASE } },
      { category: 'navigation', message: `/tx/[hash]?hash=${TX_HASH}` },
    ],
    fingerprint: [`send-${ADDRESS}`],
  };

  it('rebuilds the event from an allowlist with every secret removed', () => {
    const scrubbed = scrubEvent(event);
    expectNoSecrets(scrubbed);
    expect(scrubbed).toEqual({
      type: undefined,
      event_id: 'abc',
      timestamp: 10,
      level: 'error',
      platform: 'javascript',
      release: 'muvo@1.1.0+0123456',
      dist: '42',
      environment: 'dev',
      sdk: { name: 'sentry.javascript.react-native', version: '8.28.0' },
      message: 'Send to 0x…redacted failed',
      exception: {
        values: [
          {
            type: 'Error',
            value:
              'invalid mnemonic: [redacted:phrase]. Key: [redacted:hex]; tx [redacted:hex]; pin [redacted]',
            mechanism: { type: 'generic', handled: true },
            stacktrace: {
              frames: [
                {
                  filename: 'http://192.168.1.20:8081/index.ts.bundle',
                  function: 'signWithSecret',
                  lineno: 12,
                  colno: 3,
                  in_app: true,
                },
              ],
            },
          },
        ],
      },
      contexts: {
        os: { name: 'iOS', version: '18.1' },
        app: { app_version: '1.1.0', app_build: '42' },
        device: { model: 'iPhone15,2' },
      },
      breadcrumbs: [
        {
          category: 'log',
          level: undefined,
          timestamp: undefined,
          message: 'Reading 0x…redacted',
          data: { clipboard: '[redacted]' },
        },
        { category: 'navigation', level: undefined, timestamp: undefined, message: '/tx/[hash]' },
      ],
      fingerprint: ['send-0x…redacted'],
    });
  });

  it('never carries user, request, extra, tags or a device name', () => {
    const scrubbed: Record<string, unknown> = { ...scrubEvent(event) };
    for (const field of ['user', 'request', 'extra', 'tags', 'server_name']) {
      expect(scrubbed[field]).toBeUndefined();
    }
    expect(JSON.stringify(scrubbed)).not.toMatch(/Naomi|10\.64\.24\.7|device-id/);
  });

  it('copes with an event that has almost nothing', () => {
    const bare: ErrorEvent = { type: undefined, message: 'boom' };
    const crumbs: Breadcrumb[] = [];
    expect(scrubEvent(bare)).toMatchObject({ message: 'boom', breadcrumbs: crumbs });
  });
});
