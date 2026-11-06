import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { listNodes, network, useActiveRpcUrl, useNetworkStore } from '@/entities/network';
import { logger } from '@/shared/lib';
import { Button, ListSection, Text } from '@/shared/ui';

import { removeCustomNode, selectNode } from '../model/select-node';
import { useNodeProbes } from '../model/use-node-probes';
import { CustomNodeForm } from './custom-node-form';
import { NodeRow } from './node-row';
import { useFailureMessage } from './use-failure-message';

/** Settings > Network: pick a preset node or the user's own; each is chain-checked first. */
export function NetworkSettings() {
  const { t } = useTranslation();
  const describeFailure = useFailureMessage();
  const customUrl = useNetworkStore((state) => state.customUrl);
  const activeUrl = useActiveRpcUrl();
  const nodes = listNodes(customUrl);
  const { statuses, setStatus, checkAll } = useNodeProbes(nodes.map((node) => node.url));
  const [error, setError] = useState<string | null>(null);

  const choose = async (url: string) => {
    if (url === activeUrl) return;
    setError(null);
    setStatus(url, { status: 'checking' });
    try {
      const result = await selectNode(url);
      if (result.ok) return;
      setStatus(url, result.probe);
      setError(describeFailure(result.probe));
    } catch (caught) {
      logger.error('Switching RPC node failed', { error: caught });
      setError(t('settings.network.refusedUnreachable'));
    }
  };

  return (
    <View className="gap-6">
      <ListSection
        title={t('settings.network.nodesTitle')}
        footer={t('settings.network.nodesFooter', { chainId: network.chainId })}
      >
        {/* Presets come first in listNodes, so the index numbers them. */}
        {nodes.map((node, index) => (
          <NodeRow
            key={node.url}
            name={
              node.isCustom
                ? t('settings.network.customName')
                : t('settings.network.nodeName', { number: index + 1 })
            }
            url={node.url}
            status={statuses[node.url]}
            isSelected={node.url === activeUrl}
            onSelect={() => void choose(node.url)}
          />
        ))}
      </ListSection>
      {error ? (
        <Text tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <Button
        label={t('settings.network.checkAll')}
        variant="ghost"
        onPress={() => void checkAll()}
      />
      <View className="gap-3">
        <Text variant="heading" accessibilityRole="header">
          {t('settings.network.addTitle')}
        </Text>
        {customUrl === null ? (
          <CustomNodeForm />
        ) : (
          <Button
            label={t('settings.network.remove')}
            variant="secondary"
            onPress={removeCustomNode}
          />
        )}
      </View>
    </View>
  );
}
