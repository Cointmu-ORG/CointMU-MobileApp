import { pinHasher, readPinRecord, writePinRecord } from '@/entities/auth';
import { useTxStore, type LocalTxRecord } from '@/entities/transaction';
import { readWalletSecret, useWalletStore } from '@/entities/wallet';

import { addWallet, seedWallet } from '../../../../jest.seed-wallet';
import { removeWallet, resetWallet } from './reset-wallet';

// Public Hardhat test accounts; never hold real funds.
const FIRST = {
  secret: {
    kind: 'mnemonic',
    phrase: 'test test test test test test test test test test test junk',
  },
  address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
} as const;
const SECOND = {
  secret: {
    kind: 'private-key',
    privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  },
  address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
} as const;

const state = () => useWalletStore.getState();

function txFrom(from: string, hash: string): LocalTxRecord {
  return {
    hash,
    from,
    to: FIRST.address,
    value: '1',
    assetKey: 'native',
    nonce: 0,
    fee: { mode: 'legacy', gasLimit: '21000', gasPrice: '1' },
    node: 'http://rpc.test.invalid',
    createdAt: 0,
    status: 'pending',
    confirmations: 0,
    blockNumber: null,
    unknownSince: null,
  };
}

async function seedTwoWallets() {
  const firstId = await seedWallet(FIRST);
  await writePinRecord(await pinHasher.hash('123456'));
  state().activate();
  const secondId = await addWallet(SECOND);
  useTxStore.getState().clear();
  useTxStore.getState().add(txFrom(FIRST.address, '0x01'));
  useTxStore.getState().add(txFrom(SECOND.address, '0x02'));
  return { firstId, secondId };
}

describe('removeWallet', () => {
  it('removes one wallet: its key and sent records go, the rest and the PIN stay', async () => {
    const { firstId, secondId } = await seedTwoWallets();

    await removeWallet(secondId);

    expect(state()).toMatchObject({ status: 'active', activeWalletId: firstId });
    expect(state().wallets.map((wallet) => wallet.id)).toEqual([firstId]);
    await expect(readWalletSecret(secondId)).resolves.toBeNull();
    await expect(readWalletSecret(firstId)).resolves.toEqual(FIRST.secret);
    await expect(readPinRecord()).resolves.not.toBeNull();
    expect(useTxStore.getState().records.map((record) => record.hash)).toEqual(['0x01']);
  });

  it('removing the last wallet wipes the PIN too and returns to onboarding', async () => {
    const { firstId, secondId } = await seedTwoWallets();
    await removeWallet(secondId);

    await removeWallet(firstId);

    expect(state()).toMatchObject({ status: 'none', wallets: [], address: null });
    await expect(readWalletSecret(firstId)).resolves.toBeNull();
    await expect(readPinRecord()).resolves.toBeNull();
    expect(useTxStore.getState().records).toEqual([]);
  });

  it('ignores an unknown wallet', async () => {
    const { firstId, secondId } = await seedTwoWallets();
    await removeWallet('0'.repeat(32));
    expect(state().wallets.map((wallet) => wallet.id)).toEqual([firstId, secondId]);
  });
});

describe('resetWallet', () => {
  it('deletes every wallet key and the PIN', async () => {
    const { firstId, secondId } = await seedTwoWallets();
    await resetWallet();
    await expect(readWalletSecret(firstId)).resolves.toBeNull();
    await expect(readWalletSecret(secondId)).resolves.toBeNull();
    await expect(readPinRecord()).resolves.toBeNull();
    expect(state().status).toBe('none');
  });
});
