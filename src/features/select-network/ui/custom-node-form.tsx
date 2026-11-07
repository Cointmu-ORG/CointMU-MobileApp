import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { logger } from '@/shared/lib';
import { Button, Input } from '@/shared/ui';

import { addCustomNode, type AddNodeResult } from '../model/select-node';
import { useFailureMessage } from './use-failure-message';

/** Adds the user's own RPC node; it is checked (chain ID) before it is saved or used. */
export function CustomNodeForm() {
  const { t } = useTranslation();
  const describeFailure = useFailureMessage();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const describe = (result: Exclude<AddNodeResult, { ok: true }>) =>
    'error' in result ? t(`settings.network.${result.error}`) : describeFailure(result.probe);

  const submit = async () => {
    setIsBusy(true);
    setError(null);
    try {
      const result = await addCustomNode(url);
      if (result.ok) setUrl('');
      else setError(describe(result));
    } catch (caught) {
      logger.error('Adding a custom RPC node failed', { error: caught });
      setError(t('settings.network.status.unreachable'));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <View className="gap-3">
      <Input
        label={t('settings.network.urlField')}
        placeholder={t('settings.network.urlPlaceholder')}
        value={url}
        onChangeText={(text) => {
          setUrl(text);
          setError(null);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        inputMode="url"
        returnKeyType="done"
        onSubmitEditing={() => void submit()}
        status={error ? 'error' : 'default'}
        message={error ?? t('settings.network.addHint')}
      />
      <Button
        label={t('settings.network.add')}
        variant="secondary"
        onPress={() => void submit()}
        isLoading={isBusy}
        isDisabled={url.trim() === ''}
      />
    </View>
  );
}
