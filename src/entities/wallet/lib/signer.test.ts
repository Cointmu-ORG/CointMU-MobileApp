import { Transaction } from 'ethers';

import { SignerMismatchError, signWithSecret } from './signer';

// Public Hardhat test accounts; never hold real funds.
const KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const OTHER = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const CHAIN_ID = 1912;

const TX = {
  to: OTHER,
  value: 1n,
  nonce: 0,
  gasLimit: 21_000n,
  chainId: CHAIN_ID,
  type: 2,
  maxFeePerGas: 2n,
  maxPriorityFeePerGas: 1n,
};

describe('signWithSecret', () => {
  it('signs for the active account with the chain ID set', async () => {
    const signed = await signWithSecret(
      { kind: 'private-key', privateKey: KEY },
      { index: 0, address: ADDRESS },
      TX,
    );
    const tx = Transaction.from(signed);
    expect(tx.from).toBe(ADDRESS);
    expect(tx.chainId).toBe(BigInt(CHAIN_ID));
  });

  it('refuses to sign when the secret does not match the account', async () => {
    await expect(
      signWithSecret({ kind: 'private-key', privateKey: KEY }, { index: 0, address: OTHER }, TX),
    ).rejects.toThrow(SignerMismatchError);
  });
});
