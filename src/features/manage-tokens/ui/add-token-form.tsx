import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useAllTokens, useTokenStore, type Erc20Asset } from '@/entities/asset';
import { logger, shortenAddress } from '@/shared/lib';
import { Button, Card, Input, Notice, Text } from '@/shared/ui';

import { lookupToken } from '../model/lookup-token';

function TokenPreview({ token, onAdd }: { token: Erc20Asset; onAdd: () => void }) {
  const { t } = useTranslation();
  return (
    <Card className="gap-3">
      <View className="gap-1">
        <Text variant="heading">{token.symbol}</Text>
        {token.name ? <Text tone="secondary">{token.name}</Text> : null}
        <Text variant="mono" tone="secondary">
          {shortenAddress(token.address)}
        </Text>
        <Text variant="caption" tone="secondary">
          {t('tokens.decimals', { count: token.decimals })}
        </Text>
      </View>
      <Notice tone="warning" title={t('tokens.unverifiedTitle')}>
        {t('tokens.unverifiedBody')}
      </Notice>
      <Button label={t('tokens.add')} onPress={onAdd} />
    </Card>
  );
}

/** Add a custom ERC-20 by contract address: look it up, warn, then add on confirmation. */
export function AddTokenForm() {
  const { t } = useTranslation();
  const known = useAllTokens();
  const [address, setAddress] = useState('');
  const [preview, setPreview] = useState<Erc20Asset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const lookUp = async () => {
    setIsBusy(true);
    setError(null);
    setPreview(null);
    try {
      const result = await lookupToken(address, known);
      if (result.ok) setPreview(result.token);
      else setError(t(`tokens.errors.${result.error}`));
    } catch (caught) {
      logger.warn('Token lookup failed', { error: caught });
      setError(t('tokens.errors.network'));
    } finally {
      setIsBusy(false);
    }
  };

  const paste = async () => {
    setAddress((await Clipboard.getStringAsync()).trim());
    setPreview(null);
  };

  const add = (token: Erc20Asset) => {
    useTokenStore.getState().addCustom(token);
    setPreview(null);
    setAddress('');
  };

  return (
    <View className="gap-3">
      <Input
        label={t('tokens.addressField')}
        placeholder="0x…"
        value={address}
        onChangeText={(text) => {
          setAddress(text);
          setError(null);
          setPreview(null);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        status={error ? 'error' : 'default'}
        message={error ?? undefined}
      />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Button variant="secondary" label={t('common.paste')} onPress={() => void paste()} />
        </View>
        <View className="flex-1">
          <Button
            label={t('tokens.lookUp')}
            onPress={() => void lookUp()}
            isLoading={isBusy}
            isDisabled={address.trim() === ''}
          />
        </View>
      </View>
      {preview ? <TokenPreview token={preview} onAdd={() => add(preview)} /> : null}
    </View>
  );
}
