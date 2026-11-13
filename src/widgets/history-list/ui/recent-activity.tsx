import Inbox from 'lucide-react-native/icons/inbox';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Card, ICON_SIZE, Notice, Skeleton, Text, useThemeColors } from '@/shared/ui';

import { useAccountsByAddress } from '../model/use-accounts-by-address';
import { useHistory } from '../model/use-history';
import { HistoryRow } from './history-row';

const RECENT_LIMIT = 10;
const EMPTY_ICON_SIZE = ICON_SIZE.lg + ICON_SIZE.sm;
const SKELETON_ROWS = ['a', 'b', 'c'] as const;

type RecentActivityProps = {
  /** One account's activity (its own screen); every account's when left out. */
  owner?: string;
  /** Opens the full history. */
  onSeeAll: () => void;
  enterIndex?: number;
};

function Placeholder() {
  const { t } = useTranslation();
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={t('history.loading')}>
      {SKELETON_ROWS.map((row) => (
        <View key={row} className="min-h-16 flex-row items-center gap-3 px-3 py-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <View className="flex-1 gap-2">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-4 w-32 rounded-md" />
          </View>
          <Skeleton className="h-4 w-20 rounded-md" />
        </View>
      ))}
    </View>
  );
}

/**
 * The newest transactions, across every account or for one: the same rows as the History tab,
 * cut at RECENT_LIMIT, with the way to the full list.
 */
export function RecentActivity({ owner, onSeeAll, enterIndex = 0 }: RecentActivityProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { items, status, isFirstLoad, loadMore } = useHistory(owner ?? null);
  const accounts = useAccountsByAddress();
  const recent = items.slice(0, RECENT_LIMIT);
  const isEmpty = recent.length === 0;

  return (
    <Card enterIndex={enterIndex} className="gap-2 px-2">
      <View className="flex-row items-center justify-between pl-3">
        <Text variant="heading" accessibilityRole="header">
          {t('home.transactions.title')}
        </Text>
        <Button variant="ghost" label={t('home.transactions.seeAll')} onPress={onSeeAll} />
      </View>
      {recent.map((item) => (
        <HistoryRow
          key={`${item.hash}:${item.owner}`}
          item={item}
          account={owner === undefined ? accounts.get(item.owner) : undefined}
        />
      ))}
      {isEmpty && isFirstLoad ? <Placeholder /> : null}
      {isEmpty && status === 'error' ? (
        <View className="gap-3 px-3 pb-3">
          <Notice tone="danger">{t('history.error')}</Notice>
          <Button variant="secondary" label={t('history.retry')} onPress={loadMore} />
        </View>
      ) : null}
      {isEmpty && !isFirstLoad && status !== 'error' ? (
        <View className="items-center gap-2 px-3 py-6">
          <Inbox size={EMPTY_ICON_SIZE} color={colors.content.secondary} />
          <Text variant="label">{t('home.transactions.empty')}</Text>
          <Text variant="caption" tone="secondary" className="text-center">
            {t('home.transactions.emptyHint')}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}
