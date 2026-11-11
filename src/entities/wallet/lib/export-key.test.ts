import { SignerMismatchError } from './signer';
import { exportPrivateKey } from './export-key';

jest.mock('@/shared/lib', () => ({
  ...jest.requireActual('@/shared/lib'),
  waitForPaint: jest.fn(async () => undefined),
}));

// Hardhat's well-known test mnemonic and its first two accounts: never a real wallet.
const PHRASE = 'test test test test test test test test test test test junk';
const ACCOUNT_0 = {
  index: 0,
  address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  key: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
};
const ACCOUNT_1 = {
  index: 1,
  address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  key: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
};

describe('exportPrivateKey', () => {
  it('derives the key of the requested account from a recovery phrase', async () => {
    const secret = { kind: 'mnemonic', phrase: PHRASE } as const;
    await expect(exportPrivateKey(secret, ACCOUNT_0)).resolves.toBe(ACCOUNT_0.key);
    await expect(exportPrivateKey(secret, ACCOUNT_1)).resolves.toBe(ACCOUNT_1.key);
  });

  it('returns the stored key of a private-key wallet', async () => {
    const secret = { kind: 'private-key', privateKey: ACCOUNT_0.key } as const;
    await expect(exportPrivateKey(secret, ACCOUNT_0)).resolves.toBe(ACCOUNT_0.key);
  });

  it('refuses a key that does not belong to the account', async () => {
    const secret = { kind: 'private-key', privateKey: ACCOUNT_0.key } as const;
    await expect(exportPrivateKey(secret, ACCOUNT_1)).rejects.toBeInstanceOf(SignerMismatchError);
  });
});
