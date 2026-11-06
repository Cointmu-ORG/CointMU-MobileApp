import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { ListRow, Text, type TextTone } from '@/shared/ui';

import { displayHost } from '../lib/describe-node';
import type { NodeStatus } from '../model/use-node-probes';

type NodeRowProps = {
  name: string;
  url: string;
  status: NodeStatus | undefined;
  isSelected: boolean;
  onSelect: () => void;
};

function useStatusLabel(status: NodeStatus | undefined): { text: string; tone: TextTone } {
  const { t } = useTranslation();
  switch (status?.status) {
    case undefined:
      return { text: t('settings.network.status.unchecked'), tone: 'secondary' };
    case 'checking':
      return { text: t('settings.network.status.checking'), tone: 'secondary' };
    case 'reachable':
      return {
        text: t('settings.network.status.reachable', { ms: status.latencyMs }),
        tone: 'success',
      };
    case 'wrong-chain':
      return {
        text: t('settings.network.status.wrongChain', { chainId: status.chainId }),
        tone: 'danger',
      };
    case 'unreachable':
      return { text: t('settings.network.status.unreachable'), tone: 'danger' };
  }
}

function RadioMark({ isSelected }: { isSelected: boolean }) {
  return (
    <View
      className={`h-5 w-5 items-center justify-center rounded-full border-2 ${
        isSelected ? 'border-primary-600' : 'border-content-secondary'
      }`}
    >
      {isSelected ? <View className="h-2.5 w-2.5 rounded-full bg-primary-600" /> : null}
    </View>
  );
}

export function NodeRow({ name, url, status, isSelected, onSelect }: NodeRowProps) {
  const label = useStatusLabel(status);
  return (
    <ListRow
      title={name}
      description={displayHost(url)}
      leading={<RadioMark isSelected={isSelected} />}
      trailing={
        <Text variant="caption" tone={label.tone} className="max-w-[40%] text-right">
          {label.text}
        </Text>
      }
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected, busy: status?.status === 'checking' }}
      accessibilityHint={label.text}
    />
  );
}
