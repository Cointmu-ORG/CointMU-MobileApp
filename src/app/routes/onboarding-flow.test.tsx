import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { readWalletSecret, splitWords, useWalletStore } from '@/entities/wallet';
import { i18n } from '@/shared/i18n';

import { preloadRoutes } from '../../../jest.preload-routes';

preloadRoutes();

// No test hits a real RPC: the provider factory returns a stub with a fixed balance.
const ONE_CMU = 10n ** 18n;
jest.mock('@/shared/api', () => ({
  ...jest.requireActual('@/shared/api'),
  createRpcProvider: () => ({ getBalance: jest.fn(async () => ONE_CMU) }),
}));

const SLOW_STEP_TIMEOUT_MS = 10_000;
// Real key derivation and two real PIN hashes run in this flow.
const FLOW_TIMEOUT_MS = 60_000;
const PIN = ['2', '4', '6', '8', '0', '1'];

async function enterPin() {
  for (const digit of PIN) {
    await fireEvent.press(screen.getByRole('button', { name: digit }));
  }
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

describe('onboarding flow', () => {
  it(
    'goes welcome → create → backup → verify → set-pin → home',
    async () => {
      await renderRouter('./app', { initialUrl: '/' });

      // Welcome (status none). Protected routes redirected away from the home tab.
      await fireEvent.press(await screen.findByRole('button', { name: 'Create a new wallet' }));

      // Create derives the key, stores the phrase, flips status to pendingBackup → backup screen.
      expect(
        await screen.findByText('Your recovery phrase', {}, { timeout: SLOW_STEP_TIMEOUT_MS }),
      ).toBeOnTheScreen();
      expect(useWalletStore.getState().status).toBe('pendingBackup');
      const secret = await readWalletSecret(useWalletStore.getState().activeWalletId ?? '');
      if (secret?.kind !== 'mnemonic') throw new Error('expected a stored mnemonic');
      const words = splitWords(secret.phrase);
      expect(await screen.findByText(words[0] as string)).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: "I've written it down" }));

      // Verify: answer the 3 random words.
      const fields = await screen.findAllByLabelText(/^Word #\d+$/);
      expect(fields).toHaveLength(3);
      for (const field of fields) {
        const wordNumber = Number(/\d+/.exec(field.props.accessibilityLabel as string)?.[0]);
        await fireEvent.changeText(field, words[wordNumber - 1]);
      }
      await fireEvent.press(screen.getByRole('button', { name: 'Verify' }));

      // Quiz passed → pendingPin → set-pin.
      expect(await screen.findByText('Create a 6-digit PIN')).toBeOnTheScreen();
      await enterPin();
      expect(await screen.findByText('Enter the PIN again')).toBeOnTheScreen();
      await enterPin();

      // PIN saved, no biometrics in tests → active + unlocked → home tab with the new wallet's card.
      expect(
        await screen.findByRole('button', { name: 'Transfer' }, { timeout: SLOW_STEP_TIMEOUT_MS }),
      ).toBeOnTheScreen();
      // The mocked 1 CMU shows on the account card.
      expect(await screen.findByText('1 CMU')).toBeOnTheScreen();
      expect(useWalletStore.getState().status).toBe('active');
    },
    FLOW_TIMEOUT_MS,
  );
});
