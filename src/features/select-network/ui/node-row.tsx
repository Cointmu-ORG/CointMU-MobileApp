import Trash2 from 'lucide-react-native/icons/trash-2';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatUrlHost } from '@/shared/lib';
import {
  ICON_SIZE,
  PressableSurface,
  RadioMark,
  SURFACE_PALETTE,
  Text,
  useThemeColors,
} from '@/shared/ui';

import type { NodeStatus } from '../model/use-node-checks';
import { StatusChip } from './status-chip';
import { useNodeFacts } from './use-node-facts';

type NodeRowProps = {
  name: string;
  url: string;
  status: NodeStatus | undefined;
  /** Highest block among the pinged CointMU nodes; this node is compared with it. */
  bestHeight: number | null;
  isSelected: boolean;
  onSelect: () => void;
  /** Only the user's own nodes can be removed. */
  onRemove?: () => void;
};

/**
 * One node: tap the row to use it. The remove button is a sibling of the radio, not a child,
 * so a screen reader reaches both.
 */
export function NodeRow(props: NodeRowProps) {
  const { name, url, status, bestHeight, isSelected, onSelect, onRemove } = props;
  const { t } = useTranslation();
  const colors = useThemeColors();
  const facts = useNodeFacts(status, bestHeight);
  const summary = facts.map((fact) => fact.label).join(', ');

  return (
    <View className="flex-row items-stretch bg-surface-card">
      <PressableSurface
        palette={SURFACE_PALETTE.row}
        containerClassName="flex-1"
        className="min-h-14 flex-row items-start gap-3 px-4 py-3"
        onPress={onSelect}
        accessibilityRole="radio"
        accessibilityLabel={name}
        accessibilityState={{ checked: isSelected, busy: status?.status === 'checking' }}
        accessibilityHint={summary}
      >
        <View className="pt-0.5">
          <RadioMark isSelected={isSelected} />
        </View>
        <View className="flex-1 gap-2">
          <View className="gap-0.5">
            <View className="flex-row flex-wrap items-center gap-2">
              <Text variant="label">{name}</Text>
              {isSelected ? (
                <Text variant="caption" tone="primary">
                  {t('settings.network.inUse')}
                </Text>
              ) : null}
            </View>
            <Text variant="caption" tone="secondary">
              {formatUrlHost(url)}
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-1.5">
            {facts.map(({ key, ...fact }) => (
              <StatusChip key={key} {...fact} />
            ))}
          </View>
        </View>
      </PressableSurface>
      {onRemove ? (
        <PressableSurface
          palette={SURFACE_PALETTE.row}
          className="h-full w-12 items-center justify-center"
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={t('settings.network.removeNode', { name })}
        >
          <Trash2 size={ICON_SIZE.md} color={colors.danger.strong} />
        </PressableSurface>
      ) : null}
    </View>
  );
}
