import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { logger } from '@/shared/lib';
import { Button, Input } from '@/shared/ui';

import {
  importFromMnemonic,
  importFromPrivateKey,
  type ImportError,
  type ImportTarget,
} from '../model/import-wallet';
import { ImportModeToggle, type ImportMode } from './import-mode-toggle';
import { PrivateKeyWarning } from './private-key-warning';

const ERROR_KEYS: Record<ImportError | 'failed', string> = {
  invalidMnemonic: 'onboarding.import.invalidMnemonic',
  invalidPrivateKey: 'onboarding.import.invalidPrivateKey',
  duplicate: 'onboarding.import.duplicate',
  limitReached: 'onboarding.import.limitReached',
  wrongWallet: 'onboarding.import.wrongWallet',
  failed: 'onboarding.import.error',
};

// Secret input: no autocorrect, suggestions or autofill that could keep a copy.
const SECRET_INPUT_PROPS = {
  autoCapitalize: 'none',
  autoCorrect: false,
  autoComplete: 'off',
  spellCheck: false,
  importantForAutofill: 'no',
} as const;

type ImportWalletFormProps = {
  /** Defaults to adding a new wallet; `recover` restores one wallet's unreadable secret. */
  target?: ImportTarget;
  /** Called with the wallet's id. Onboarding needs none: the wallet status moves the router. */
  onImported?: (walletId: string) => void;
};

/** In onboarding, success changes the wallet status and the router moves on to set-pin. */
export function ImportWalletForm({ target, onImported }: ImportWalletFormProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<ImportMode>('mnemonic');
  const [value, setValue] = useState('');
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const [error, setError] = useState<ImportError | 'failed' | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const isPrivateKey = mode === 'private-key';

  const submit = async () => {
    setIsBusy(true);
    setError(null);
    try {
      const result = isPrivateKey
        ? await importFromPrivateKey(value, target)
        : await importFromMnemonic(value, target);
      if (result.ok) onImported?.(result.walletId);
      else setError(result.error);
    } catch (caught) {
      logger.error('Wallet import failed', { error: caught });
      setError('failed');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <View className="gap-5">
      <ImportModeToggle
        mode={mode}
        onChange={(next) => {
          setMode(next);
          setValue('');
          setError(null);
          // D-28: the acknowledgement belongs to the key being imported, never carried over.
          setIsAcknowledged(false);
        }}
      />
      <Input
        label={t(
          isPrivateKey ? 'onboarding.import.privateKeyLabel' : 'onboarding.import.mnemonicLabel',
        )}
        value={value}
        onChangeText={setValue}
        multiline={!isPrivateKey}
        // Return closes the keyboard so the button below is reachable; a phrase needs no newline.
        submitBehavior="blurAndSubmit"
        returnKeyType="done"
        secureTextEntry={isPrivateKey}
        status={error ? 'error' : 'default'}
        message={error ? t(ERROR_KEYS[error]) : undefined}
        {...SECRET_INPUT_PROPS}
      />
      {isPrivateKey ? (
        <PrivateKeyWarning
          isAcknowledged={isAcknowledged}
          onToggle={() => setIsAcknowledged((current) => !current)}
        />
      ) : null}
      <Button
        label={t('onboarding.import.submit')}
        onPress={() => void submit()}
        isLoading={isBusy}
        isDisabled={value.trim() === '' || (isPrivateKey && !isAcknowledged)}
      />
    </View>
  );
}
