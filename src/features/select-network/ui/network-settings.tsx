import RefreshCw from 'lucide-react-native/icons/refresh-cw';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  bestBlockHeight,
  MAX_NODES,
  network,
  remainingCustomSlots,
  useActiveRpcUrl,
  useNetworkStore,
  type NodeProbe,
} from '@/entities/network';
import { logger } from '@/shared/lib';
import { Button, ICON_SIZE, ListSection, Notice, Text, useThemeColors } from '@/shared/ui';

import { removeCustomNode, selectNode } from '../model/select-node';
import type { NodeChecks, NodeStatus } from '../model/use-node-checks';
import { CustomNodeForm } from './custom-node-form';
import { NodeRow } from './node-row';
import { useFailureMessage } from './use-failure-message';

function isProbe(status: NodeStatus | undefined): status is NodeProbe {
  return status !== undefined && status.status !== 'checking';
}

/**
 * Settings > Network: the preset nodes and the user's own, each with its ping (status, latency,
 * block height, chain check, out of sync). A node is only switched to after a fresh chain check.
 * The screen owns the scroll view and the pull-to-refresh; `checks` comes from `useNodeChecks`.
 */
export function NetworkSettings({ checks }: { checks: NodeChecks }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const describeFailure = useFailureMessage();
  const customUrls = useNetworkStore((state) => state.customUrls);
  const activeUrl = useActiveRpcUrl();
  const { nodes, statuses, isChecking, checkAll, setStatus } = checks;
  const [error, setError] = useState<string | null>(null);
  const bestHeight = bestBlockHeight(Object.values(statuses).filter(isProbe));
  const presetCount = network.presetUrls.length;

  const choose = async (url: string) => {
    if (url === activeUrl) return;
    setError(null);
    setStatus(url, { status: 'checking' });
    try {
      const result = await selectNode(url);
      if (result.ok) return void checkAll();
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
        {/* Presets come first, so the index numbers each kind from 1. */}
        {nodes.map((node, index) => (
          <NodeRow
            key={node.url}
            name={
              node.isCustom
                ? t('settings.network.customName', { number: index - presetCount + 1 })
                : t('settings.network.nodeName', { number: index + 1 })
            }
            url={node.url}
            status={statuses[node.url]}
            bestHeight={bestHeight}
            isSelected={node.url === activeUrl}
            onSelect={() => void choose(node.url)}
            onRemove={node.isCustom ? () => removeCustomNode(node.url) : undefined}
          />
        ))}
      </ListSection>
      {error ? (
        <Text tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <Button
        label={t(isChecking ? 'settings.network.pinging' : 'settings.network.pingAll')}
        variant="secondary"
        icon={<RefreshCw size={ICON_SIZE.md} color={colors.accent.DEFAULT} />}
        onPress={() => void checkAll()}
        isDisabled={isChecking}
      />
      <View className="gap-3">
        <Text variant="heading" accessibilityRole="header">
          {t('settings.network.addTitle')}
        </Text>
        <Notice tone="warning">{t('settings.network.addWarning')}</Notice>
        {remainingCustomSlots(customUrls) > 0 ? (
          <CustomNodeForm />
        ) : (
          <Text tone="secondary">{t('settings.network.limitReached', { max: MAX_NODES })}</Text>
        )}
      </View>
    </View>
  );
}
