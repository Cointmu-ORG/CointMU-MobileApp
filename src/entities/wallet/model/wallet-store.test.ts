import AsyncStorage from '@react-native-async-storage/async-storage';

import { secureStorage } from '@/shared/lib';

import { createWalletId, readWalletSecret } from '../api/wallet-secret';
import { LEGACY_WALLET_ID } from '../config/wallet-config';
import { migrateWalletState } from './migrate';
import type { NewWallet, WalletRecord } from './types';
import { useWalletStore } from './wallet-store';

const A0 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const A1 = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const B0 = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
const PHRASE = 'test test test test test test test test test test test junk';
const STORAGE_KEY = 'muvo.wallet';
const LEGACY_SECRET_KEY = 'muvo.wallet.secret';

const state = () => useWalletStore.getState();
const wallet = (id: string) => state().wallets.find((candidate) => candidate.id === id);

function newWallet(address: string, change: Partial<NewWallet> = {}): NewWallet {
  return {
    id: createWalletId(),
    source: 'mnemonic',
    origin: 'imported',
    address,
    addedAt: 1,
    ...change,
  };
}

/** A finished single wallet, then a second one: returns both ids. */
function seedTwoWallets(second: Partial<NewWallet> = {}) {
  const first = newWallet(A0);
  state().addWallet(first);
  state().activate();
  const other = newWallet(B0, second);
  state().addWallet(other);
  return { firstId: first.id, secondId: other.id };
}

beforeEach(() => state().reset());

const V1_PRIVATE_KEY = {
  status: 'active',
  address: B0,
  source: 'private-key',
  accountIndex: 0,
  accounts: [{ index: 0, address: B0, name: null }],
  isRecoveryRequired: false,
};

describe('migrateWalletState', () => {
  const V1_MNEMONIC = {
    status: 'active',
    address: A1,
    source: 'mnemonic',
    accountIndex: 1,
    accounts: [
      { index: 0, address: A0, name: 'Savings' },
      { index: 1, address: A1, name: null },
    ],
    isRecoveryRequired: false,
  };

  it('leaves a fresh install with no wallets', () => {
    const v1 = { status: 'none', address: null, source: null, accountIndex: 0, accounts: [] };
    expect(migrateWalletState(v1, 1)).toMatchObject({
      status: 'none',
      wallets: [],
      activeWalletId: null,
    });
  });

  it('turns a recovery-phrase wallet with several accounts into wallet 1, names kept', () => {
    const migrated = migrateWalletState(V1_MNEMONIC, 1) as ReturnType<typeof state>;
    expect(migrated).toMatchObject({
      status: 'active',
      activeWalletId: LEGACY_WALLET_ID,
      accountIndex: 1,
      address: A1,
      source: 'mnemonic',
    });
    expect(migrated).not.toHaveProperty('accounts');
    expect(migrated.wallets).toHaveLength(1);
    expect(migrated.wallets[0]).toMatchObject({
      id: LEGACY_WALLET_ID,
      number: 1,
      source: 'mnemonic',
      isBackupPending: false,
      needsRecovery: false,
    });
    expect(migrated.wallets[0]?.accounts).toMatchObject([
      { index: 0, address: A0, name: 'Savings' },
      { index: 1, address: A1, name: null },
    ]);
  });

  it('turns a private-key wallet into an imported wallet with its one account', () => {
    const v1 = {
      status: 'active',
      address: A0,
      source: 'private-key',
      accountIndex: 0,
      accounts: [{ index: 0, address: A0, name: null }],
    };
    const migrated = migrateWalletState(v1, 1) as ReturnType<typeof state>;
    expect(migrated.wallets[0]).toMatchObject({ source: 'private-key', origin: 'imported' });
    expect(migrated.wallets[0]?.accounts).toHaveLength(1);
  });

  it('keeps a wallet that was waiting for its backup waiting', () => {
    const v1 = { ...V1_MNEMONIC, status: 'pendingBackup', accountIndex: 0, address: A0 };
    const migrated = migrateWalletState(v1, 1) as ReturnType<typeof state>;
    expect(migrated.status).toBe('pendingBackup');
    expect(migrated.wallets[0]?.isBackupPending).toBe(true);
  });

  it('carries a v0 store (one address, no account list) all the way', () => {
    const v0 = { status: 'active', address: A0, source: 'mnemonic', accountIndex: 0 };
    const migrated = migrateWalletState(v0, 0) as ReturnType<typeof state>;
    expect(migrated.wallets[0]?.accounts).toMatchObject([{ index: 0, address: A0, name: null }]);
  });

  it('is idempotent: the same input gives the same output, and v4 passes through', () => {
    const once = migrateWalletState(V1_MNEMONIC, 1);
    expect(migrateWalletState(V1_MNEMONIC, 1)).toEqual(once);
    expect(migrateWalletState(once, 2)).toEqual(once);
    expect(migrateWalletState(once, 3)).toEqual(once);
    expect(migrateWalletState(once, 4)).toBe(once);
  });

  describe('default account (v3 → v4)', () => {
    const account = (index: number, address: string) => ({
      index,
      address,
      name: null,
      color: 'ocean',
      icon: { kind: 'lucide', name: 'wallet-minimal' },
    });
    const record = (id: string, accounts: unknown[]) => ({
      id,
      number: 1,
      name: null,
      color: 'ocean',
      source: 'mnemonic',
      origin: 'imported',
      addedAt: 1,
      isBackupPending: false,
      needsRecovery: false,
      accounts,
    });
    const V3 = {
      status: 'active',
      wallets: [
        record('a'.repeat(32), [account(0, A0), account(1, A1)]),
        record('b'.repeat(32), [account(0, B0)]),
      ],
      activeWalletId: 'a'.repeat(32),
      accountIndex: 1,
      address: A1,
      source: 'mnemonic',
      isRecoveryRequired: false,
    };

    it('starts with the account the install remembered as the default, without a notice', () => {
      const migrated = migrateWalletState(V3, 3) as ReturnType<typeof state>;
      expect(migrated.defaultAccount).toEqual({ walletId: 'a'.repeat(32), index: 1 });
      expect(migrated.hasDefaultMovedNotice).toBe(false);
      expect(migrated.wallets).toEqual(V3.wallets);
    });

    it('takes the first account when the remembered one is not there', () => {
      const migrated = migrateWalletState({ ...V3, accountIndex: 9 }, 3) as ReturnType<
        typeof state
      >;
      expect(migrated.defaultAccount).toEqual({ walletId: 'a'.repeat(32), index: 0 });
    });

    it('has no default before there is a wallet', () => {
      const empty = { status: 'none', wallets: [], activeWalletId: null, accountIndex: 0 };
      expect((migrateWalletState(empty, 3) as ReturnType<typeof state>).defaultAccount).toBeNull();
    });

    it('carries the remembered account of a v1 store all the way', () => {
      const migrated = migrateWalletState(V1_MNEMONIC, 1) as ReturnType<typeof state>;
      expect(migrated.defaultAccount).toEqual({ walletId: LEGACY_WALLET_ID, index: 1 });
    });

    it('loads a stored v3 install with its remembered account as the default and in use', async () => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 3, state: V3 }));
      await useWalletStore.persist.rehydrate();
      expect(state()).toMatchObject({
        defaultAccount: { walletId: 'a'.repeat(32), index: 1 },
        activeWalletId: 'a'.repeat(32),
        accountIndex: 1,
        address: A1,
      });
    });
  });
});

describe('migrateWalletState: card icons (v2 to v3)', () => {
  const account = (index: number, address: string, change: object = {}) => ({
    index,
    address,
    name: null,
    color: 'ocean',
    ...change,
  });
  const v2Wallet = (id: string, source: string, accounts: object[]) => ({
    id,
    number: 1,
    name: 'Family',
    color: 'teal',
    source,
    origin: 'imported',
    addedAt: 1,
    isBackupPending: false,
    needsRecovery: false,
    accounts,
  });
  const V2 = {
    status: 'active',
    wallets: [
      v2Wallet('a'.repeat(32), 'mnemonic', [
        account(0, A0, { name: 'Savings', color: 'plum' }),
        account(1, A1),
      ]),
      v2Wallet('b'.repeat(32), 'private-key', [account(0, B0, { color: 'rose' })]),
    ],
    activeWalletId: 'a'.repeat(32),
    accountIndex: 1,
    address: A1,
    source: 'mnemonic',
    isRecoveryRequired: false,
  };
  const migrate = (input: unknown) => migrateWalletState(input, 2) as ReturnType<typeof state>;

  it('gives every account the icon its card already had and keeps the rest', () => {
    const migrated = migrate(V2);
    expect(migrated).toMatchObject({ ...V2, wallets: [{ name: 'Family' }, { color: 'teal' }] });
    expect(migrated.wallets[0]?.accounts).toEqual([
      account(0, A0, {
        name: 'Savings',
        color: 'plum',
        icon: { kind: 'lucide', name: 'wallet-minimal' },
      }),
      account(1, A1, { icon: { kind: 'lucide', name: 'wallet-minimal' } }),
    ]);
    expect(migrated.wallets[1]?.accounts).toEqual([
      account(0, B0, { color: 'rose', icon: { kind: 'lucide', name: 'key-round' } }),
    ]);
  });

  it('gives a v1 store icons on the way through', () => {
    const migrated = migrateWalletState(V1_PRIVATE_KEY, 1) as ReturnType<typeof state>;
    expect(migrated.wallets[0]?.accounts[0]?.icon).toEqual({ kind: 'lucide', name: 'key-round' });
  });

  it('is repeatable', () => {
    expect(migrate(migrate(V2))).toEqual(migrate(V2));
  });
});

describe('upgrading an existing install', () => {
  const V1_RECORD = {
    version: 1,
    state: {
      status: 'active',
      address: A0,
      source: 'mnemonic',
      accountIndex: 0,
      accounts: [
        { index: 0, address: A0, name: null },
        { index: 1, address: A1, name: 'Spending' },
      ],
      isRecoveryRequired: false,
    },
  };

  async function upgradeFrom(record: unknown) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    await useWalletStore.persist.rehydrate();
  }

  beforeEach(() =>
    secureStorage.set(LEGACY_SECRET_KEY, JSON.stringify({ kind: 'mnemonic', phrase: PHRASE })),
  );

  it('makes the wallet usable with no user action and never moves its secret', async () => {
    await upgradeFrom(V1_RECORD);

    expect(state()).toMatchObject({ status: 'active', activeWalletId: LEGACY_WALLET_ID });
    expect(state().wallets[0]?.accounts).toHaveLength(2);
    await expect(readWalletSecret(LEGACY_WALLET_ID)).resolves.toEqual({
      kind: 'mnemonic',
      phrase: PHRASE,
    });
    // The secret is where it always was; nothing was copied or indexed.
    await expect(secureStorage.get(LEGACY_SECRET_KEY)).resolves.not.toBeNull();
    await expect(secureStorage.get('muvo.wallet.ids')).resolves.toBeNull();
    const stored = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? '{}');
    expect(stored.version).toBe(4);
  });

  it('gives the same wallet when the migrated state was never written back (crash)', async () => {
    await upgradeFrom(V1_RECORD);
    const first = state().wallets;

    // The app died before AsyncStorage got the v2 state: the next launch sees v1 again.
    state().reset();
    await upgradeFrom(V1_RECORD);

    expect(state().wallets).toEqual(first);
    await expect(readWalletSecret(LEGACY_WALLET_ID)).resolves.not.toBeNull();
  });

  it('does not migrate again once the store is current', async () => {
    await upgradeFrom(V1_RECORD);
    state().renameAccount(LEGACY_WALLET_ID, 0, 'Renamed');
    await useWalletStore.persist.rehydrate();
    expect(state().wallets[0]?.accounts[0]?.name).toBe('Renamed');
  });
});

describe('first wallet (onboarding)', () => {
  it('a created wallet waits for its backup, then for the PIN', () => {
    const created = newWallet(A0, { origin: 'created' });
    state().addWallet(created);
    expect(state()).toMatchObject({ status: 'pendingBackup', address: A0, source: 'mnemonic' });

    state().completeBackup(created.id);
    expect(state().status).toBe('pendingPin');
    state().activate();
    expect(state()).toMatchObject({ status: 'active', activeWalletId: created.id });
  });

  it('an imported wallet goes straight to PIN setup', () => {
    state().addWallet(newWallet(A0, { source: 'private-key' }));
    expect(state()).toMatchObject({ status: 'pendingPin', source: 'private-key' });
  });
});

describe('several wallets', () => {
  it('makes an imported second wallet active and numbers it', () => {
    const { firstId, secondId } = seedTwoWallets({ source: 'private-key' });
    expect(state().wallets.map((entry) => entry.number)).toEqual([1, 2]);
    expect(state()).toMatchObject({
      status: 'active',
      activeWalletId: secondId,
      address: B0,
      source: 'private-key',
    });
    state().selectAccount(firstId, 0);
    expect(state()).toMatchObject({ activeWalletId: firstId, address: A0, source: 'mnemonic' });
  });

  it('keeps a created second wallet out of use until its quiz is passed', () => {
    const { firstId, secondId } = seedTwoWallets({ origin: 'created' });
    expect(state()).toMatchObject({ status: 'active', activeWalletId: firstId });
    expect(wallet(secondId)?.isBackupPending).toBe(true);

    state().selectAccount(secondId, 0);
    expect(state().activeWalletId).toBe(firstId);

    state().completeBackup(secondId);
    expect(state().status).toBe('active');
    state().selectAccount(secondId, 0);
    expect(state()).toMatchObject({ activeWalletId: secondId, address: B0 });
  });

  it('adds accounts to the named wallet only, and ignores a duplicate index', () => {
    const { firstId, secondId } = seedTwoWallets();
    state().addAccount(firstId, { index: 1, address: A1 });
    state().addAccount(firstId, { index: 1, address: B0 });
    expect(wallet(firstId)?.accounts).toHaveLength(2);
    expect(wallet(secondId)?.accounts).toHaveLength(1);
    state().selectAccount(firstId, 1);
    expect(state()).toMatchObject({ activeWalletId: firstId, accountIndex: 1, address: A1 });
    state().selectAccount(firstId, 7);
    expect(state().accountIndex).toBe(1);
  });

  it('renames and recolors one account without touching the same index elsewhere', () => {
    const { firstId, secondId } = seedTwoWallets();
    state().renameAccount(firstId, 0, 'Rent');
    state().setAccountColor(firstId, 0, 'rose');
    state().updateWallet(secondId, { name: 'Trading' });
    expect(wallet(firstId)?.accounts[0]).toMatchObject({ name: 'Rent', color: 'rose' });
    expect(wallet(secondId)?.accounts[0]?.name).toBeNull();
    expect(wallet(secondId)?.name).toBe('Trading');
  });
});

describe('card icons', () => {
  it('starts a card with the icon of its wallet kind and changes one card only', () => {
    const { firstId, secondId } = seedTwoWallets({ source: 'private-key' });
    state().addAccount(firstId, { index: 1, address: A1 });
    expect(wallet(firstId)?.accounts.map((account) => account.icon)).toEqual([
      { kind: 'lucide', name: 'wallet-minimal' },
      { kind: 'lucide', name: 'wallet-minimal' },
    ]);
    expect(wallet(secondId)?.accounts[0]?.icon).toEqual({ kind: 'lucide', name: 'key-round' });

    state().setAccountIcon(firstId, 1, { kind: 'emoji', value: '🏠' });

    expect(wallet(firstId)?.accounts[1]?.icon).toEqual({ kind: 'emoji', value: '🏠' });
    expect(wallet(firstId)?.accounts[0]?.icon).toEqual({ kind: 'lucide', name: 'wallet-minimal' });
    expect(wallet(secondId)?.accounts[0]?.icon).toEqual({ kind: 'lucide', name: 'key-round' });
  });
});

describe('default account', () => {
  const ref = (walletId: string, index = 0) => ({ walletId, index });

  it('is the first wallet, and adding or importing another does not change it', () => {
    const { firstId } = seedTwoWallets();
    expect(state().defaultAccount).toEqual(ref(firstId));
    expect(state().hasDefaultMovedNotice).toBe(false);
  });

  it('is not changed by looking at an account or picking one', () => {
    const { firstId, secondId } = seedTwoWallets();
    state().selectAccount(secondId, 0);
    expect(state()).toMatchObject({ activeWalletId: secondId, defaultAccount: ref(firstId) });
  });

  it('is set by the user only, to an account that exists in a usable wallet', () => {
    const { firstId, secondId } = seedTwoWallets();
    state().setDefaultAccount(secondId, 0);
    expect(state().defaultAccount).toEqual(ref(secondId));
    // Setting the default does not change the account in use either.
    state().selectAccount(firstId, 0);
    state().setDefaultAccount(secondId, 7);
    state().setDefaultAccount('missing', 0);
    expect(state()).toMatchObject({ activeWalletId: firstId, defaultAccount: ref(secondId) });

    const pending = newWallet(A1, { origin: 'created' });
    state().addWallet(pending);
    state().setDefaultAccount(pending.id, 0);
    expect(state().defaultAccount).toEqual(ref(secondId));
  });

  it('falls back to the first usable account, with a notice, when its wallet is removed', () => {
    const { firstId, secondId } = seedTwoWallets();
    state().removeWallet(firstId);
    expect(state()).toMatchObject({ defaultAccount: ref(secondId), hasDefaultMovedNotice: true });

    state().dismissDefaultMovedNotice();
    expect(state().hasDefaultMovedNotice).toBe(false);
  });

  it('says nothing when a wallet that does not hold the default is removed', () => {
    const { firstId, secondId } = seedTwoWallets();
    state().removeWallet(secondId);
    expect(state()).toMatchObject({ defaultAccount: ref(firstId), hasDefaultMovedNotice: false });
  });

  it('falls back, with a notice, when its wallet cannot be read, and stays there afterwards', () => {
    const { firstId, secondId } = seedTwoWallets();
    state().setUnreadableWallets([firstId]);
    expect(state()).toMatchObject({ defaultAccount: ref(secondId), hasDefaultMovedNotice: true });

    state().setUnreadableWallets([]);
    expect(state().defaultAccount).toEqual(ref(secondId));
  });

  it('is left alone when no wallet can be used at all', () => {
    const { firstId, secondId } = seedTwoWallets();
    state().setUnreadableWallets([firstId, secondId]);
    expect(state()).toMatchObject({ defaultAccount: ref(firstId), hasDefaultMovedNotice: false });
  });

  it('clears the notice when the user picks a default', () => {
    const { firstId, secondId } = seedTwoWallets();
    state().removeWallet(firstId);
    expect(state().hasDefaultMovedNotice).toBe(true);
    state().setDefaultAccount(secondId, 0);
    expect(state().hasDefaultMovedNotice).toBe(false);
  });

  it('is stored; the account in use is not, and starts as the default after a restart', async () => {
    const { firstId, secondId } = seedTwoWallets();
    state().selectAccount(secondId, 0);
    const stored = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? '{}');
    expect(stored.state.defaultAccount).toEqual(ref(firstId));
    expect(stored.state).not.toHaveProperty('activeWalletId');

    await useWalletStore.persist.rehydrate();

    expect(state()).toMatchObject({
      defaultAccount: ref(firstId),
      activeWalletId: firstId,
      accountIndex: 0,
      address: A0,
      source: 'mnemonic',
    });
  });
});

describe('removeWallet', () => {
  it('removes one wallet and moves the active account to another', () => {
    const { firstId, secondId } = seedTwoWallets();
    state().removeWallet(secondId);
    expect(state()).toMatchObject({ status: 'active', activeWalletId: firstId, address: A0 });
    expect(state().wallets).toHaveLength(1);
  });

  it('keeps the active account when another wallet is removed', () => {
    const { firstId, secondId } = seedTwoWallets();
    state().removeWallet(firstId);
    expect(state()).toMatchObject({ status: 'active', activeWalletId: secondId, address: B0 });
  });

  it('returns to onboarding when the last wallet is removed', () => {
    const { firstId, secondId } = seedTwoWallets();
    state().removeWallet(firstId);
    state().removeWallet(secondId);
    expect(state()).toMatchObject({ status: 'none', wallets: [], address: null });
  });

  it('gives a later wallet a number that was never used by a present one', () => {
    const { firstId } = seedTwoWallets();
    state().removeWallet(firstId);
    state().addWallet(newWallet(A1));
    expect(state().wallets.map((entry: WalletRecord) => entry.number)).toEqual([2, 3]);
  });
});

describe('setUnreadableWallets', () => {
  it('flags only the named wallets and moves the active account off them', () => {
    const { firstId, secondId } = seedTwoWallets();
    state().setUnreadableWallets([secondId]);
    expect(wallet(secondId)?.needsRecovery).toBe(true);
    expect(wallet(firstId)?.needsRecovery).toBe(false);
    expect(state()).toMatchObject({ activeWalletId: firstId, address: A0 });

    state().selectAccount(secondId, 0);
    expect(state().activeWalletId).toBe(firstId);

    state().setUnreadableWallets([]);
    expect(wallet(secondId)?.needsRecovery).toBe(false);
  });
});
