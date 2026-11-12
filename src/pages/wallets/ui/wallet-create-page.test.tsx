import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { storeNewPin, useSessionStore } from '@/entities/auth';
import { readWalletSecret, splitWords, useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';

import { preloadRoutes } from '../../../../jest.preload-routes';
import { addWallet, seedWallet } from '../../../../jest.seed-wallet';

preloadRoutes();

// No test hits a real RPC: the provider factory returns a stub with a fixed balance.
jest.mock('@/shared/api', () => ({
  ...jest.requireActual('@/shared/api'),
  createRpcProvider: () => ({ getBalance: jest.fn(async () => 10n ** 18n) }),
}));

// Public Hardhat test account; never holds real funds.
const FIRST_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const FIRST_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const PENDING_PHRASE =
  'abandon ability able about above absent absorb abstract absurd abuse access accident';
const PENDING_ADDRESS = '0x0000000000000000000000000000000000000002';
const SLOW_STEP_TIMEOUT_MS = 10_000;
// Real key derivation runs in the create flow.
const FLOW_TIMEOUT_MS = 60_000;

const state = () => useWalletStore.getState();
let firstId = '';

async function answerQuiz(words: readonly string[]) {
  const fields = await screen.findAllByLabelText(/^Word #\d+$/);
  for (const field of fields) {
    const wordNumber = Number(/\d+/.exec(field.props.accessibilityLabel as string)?.[0]);
    await fireEvent.changeText(field, words[wordNumber - 1]);
  }
  await fireEvent.press(screen.getByRole('button', { name: 'Verify' }));
}

beforeEach(async () => {
  // renderRouter switches to fake timers; the PIN hash below waits for a real frame.
  jest.useRealTimers();
  await i18n.changeLanguage('en');
  await AsyncStorage.setItem('muvo.installed', '1');
  await storeNewPin('135790');
  firstId = await seedWallet({
    secret: { kind: 'private-key', privateKey: FIRST_KEY },
    address: FIRST_ADDRESS,
  });
  state().activate();
  useWalletStore.setState({ hasHydrated: true });
  useSessionStore.getState().unlock();
});

describe('creating another wallet', () => {
  it(
    'generates a phrase under a new wallet id, then backup → quiz → name and color → active',
    async () => {
      await renderRouter('./app', { initialUrl: '/wallet-create' });

      expect(
        await screen.findByText('Your new recovery phrase', {}, { timeout: SLOW_STEP_TIMEOUT_MS }),
      ).toBeOnTheScreen();
      const created = state().wallets[1];
      if (created === undefined) throw new Error('expected a second wallet');
      // Not usable yet: the first wallet stays active and the app stays active.
      expect(created).toMatchObject({ isBackupPending: true, source: 'mnemonic' });
      expect(state()).toMatchObject({ status: 'active', activeWalletId: firstId });

      const secret = await readWalletSecret(created.id);
      if (secret?.kind !== 'mnemonic') throw new Error('expected a stored mnemonic');
      const words = splitWords(secret.phrase);
      expect(await screen.findByText(words[0] as string)).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: "I've written it down" }));

      await answerQuiz(words);

      expect(await screen.findByText('Name your wallet')).toBeOnTheScreen();
      expect(state().wallets[1]?.isBackupPending).toBe(false);
      // The phrase is gone from the screen once the quiz is passed.
      expect(screen.queryByText(words[0] as string)).toBeNull();
      await fireEvent.changeText(screen.getByLabelText('Wallet name'), '  Trading ');
      await fireEvent.press(screen.getByRole('radio', { name: 'Rose' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Finish' }));

      await waitFor(() => expect(state().activeWalletId).toBe(created.id));
      expect(state().wallets[1]).toMatchObject({ name: 'Trading', color: 'rose' });
      expect(state().wallets[1]?.accounts[0]?.color).toBe('rose');
      expect(state().wallets).toHaveLength(2);
      // The first wallet and its key are untouched.
      await expect(readWalletSecret(firstId)).resolves.toEqual({
        kind: 'private-key',
        privateKey: FIRST_KEY,
      });
    },
    FLOW_TIMEOUT_MS,
  );

  it('resumes an unfinished backup at the phrase of that wallet', async () => {
    const pendingId = await addWallet({
      secret: { kind: 'mnemonic', phrase: PENDING_PHRASE },
      address: PENDING_ADDRESS,
      origin: 'created',
    });
    await renderRouter('./app', { initialUrl: `/wallet-create?walletId=${pendingId}` });

    expect(await screen.findByText('Your new recovery phrase')).toBeOnTheScreen();
    expect(await screen.findByText('abandon')).toBeOnTheScreen();
    expect(state().wallets).toHaveLength(2);
  });

  it('never shows the phrase of a wallet whose backup is already done', async () => {
    const doneId = await addWallet({
      secret: { kind: 'mnemonic', phrase: PENDING_PHRASE },
      address: PENDING_ADDRESS,
    });
    await renderRouter('./app', { initialUrl: `/wallet-create?walletId=${doneId}` });

    expect(await screen.findByText('Name your wallet')).toBeOnTheScreen();
    expect(screen.queryByText('abandon')).toBeNull();
    expect(screen.queryByText('Your new recovery phrase')).toBeNull();
  });
});
