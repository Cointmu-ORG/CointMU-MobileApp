import { useTranslation } from 'react-i18next';
import { Switch, View } from 'react-native';

import {
  getAssetKey,
  useAllTokens,
  useIsAssetHidden,
  useTokenStore,
  type Erc20Asset,
} from '@/entities/asset';
import { shortenAddress } from '@/shared/lib';
import { Button, colors, Text } from '@/shared/ui';

function TokenRow({ token }: { token: Erc20Asset }) {
  const { t } = useTranslation();
  const key = getAssetKey(token);
  const isShown = !useIsAssetHidden(key);
  const isCustom = token.source === 'custom';
  const label = `${token.symbol}${token.name ? `, ${token.name}` : ''}`;

  return (
    <View className="gap-2 border-b border-border py-3">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text variant="label">{label}</Text>
          <Text variant="mono" tone="secondary">
            {shortenAddress(token.address)}
          </Text>
          <Text variant="caption" tone={isCustom ? 'warning' : 'secondary'}>
            {isCustom ? t('tokens.unverified') : t('tokens.builtin')}
          </Text>
        </View>
        <Switch
          value={isShown}
          onValueChange={(next) => useTokenStore.getState().setHidden(key, !next)}
          accessibilityLabel={t('tokens.showOnHome', { symbol: token.symbol })}
          trackColor={{ true: colors.primary[600], false: colors.border.strong }}
        />
      </View>
      {isCustom ? (
        <Button
          variant="ghost"
          label={t('tokens.remove', { symbol: token.symbol })}
          onPress={() => useTokenStore.getState().removeCustom(key)}
        />
      ) : null}
    </View>
  );
}

/** Built-in and custom tokens on this chain; each can be hidden, custom ones removed. */
export function TokenList() {
  const { t } = useTranslation();
  const tokens = useAllTokens();
  if (tokens.length === 0) {
    return <Text tone="secondary">{t('tokens.empty')}</Text>;
  }
  return (
    <View>
      {tokens.map((token) => (
        <TokenRow key={getAssetKey(token)} token={token} />
      ))}
    </View>
  );
}
