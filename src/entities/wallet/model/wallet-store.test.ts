import { migrateWalletState, useWalletStore } from './wallet-store';

const A0 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const A1 = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

beforeEach(() => useWalletStore.getState().reset());

describe('migrateWalletState', () => {
  it('turns the single v0 address into the first account', () => {
    const v0 = { status: 'active', address: A0, source: 'mnemonic', accountIndex: 0 };
    expect(migrateWalletState(v0, 0)).toEqual({
      ...v0,
      accounts: [{ index: 0, address: A0, name: null }],
    });
  });

  it('keeps an empty list for a wallet that was never set up', () => {
    expect(migrateWalletState({ status: 'none', address: null }, 0)).toMatchObject({
      accounts: [],
    });
  });
});

describe('accounts', () => {
  it('starts with account 0 and switches between added accounts', () => {
    const store = useWalletStore.getState();
    store.startPinSetup(A0, 'mnemonic');
    store.addAccount({ index: 1, address: A1 });
    useWalletStore.getState().switchAccount(1);
    expect(useWalletStore.getState()).toMatchObject({ accountIndex: 1, address: A1 });
    expect(useWalletStore.getState().accounts).toHaveLength(2);
  });

  it('ignores a duplicate index and an unknown switch target', () => {
    const store = useWalletStore.getState();
    store.startPinSetup(A0, 'mnemonic');
    store.addAccount({ index: 0, address: A1 });
    useWalletStore.getState().switchAccount(7);
    expect(useWalletStore.getState()).toMatchObject({ accountIndex: 0, address: A0 });
    expect(useWalletStore.getState().accounts).toHaveLength(1);
  });
});
