import Inbox from 'lucide-react-native/icons/inbox';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, SectionList, View } from 'react-native';

import { Button, ICON_SIZE, Notice, Skeleton, Spinner, Text, useThemeColors } from '@/shared/ui';

import { groupByDay } from '../lib/group-by-day';
import { useAccountsByAddress } from '../model/use-accounts-by-address';
import { useHistory } from '../model/use-history';
import { AccountFilter } from './account-filter';
import { HistoryRow } from './history-row';

const EMPTY_ICON_SIZE = ICON_SIZE.lg * 2;
const SKELETON_ROWS = ['a', 'b', 'c', 'd'] as const;

export type HistoryListProps = {
  /** Address of the one account to show, or null for all accounts. */
  filter: string | null;
  onFilterChange: (address: string | null) => void;
};

function Header({ filter, onFilterChange }: HistoryListProps) {
  const { t } = useTranslation();
  return (
    <View className="gap-3 pb-2">
      <Text variant="title" accessibilityRole="header">
        {t('history.title')}
      </Text>
      <AccountFilter value={filter} onChange={onFilterChange} />
      <Text variant="caption" tone="secondary">
        {t('history.help')}
      </Text>
    </View>
  );
}

function Empty({ isError, onRetry }: { isError: boolean; onRetry: () => void }) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  if (isError) {
    return (
      <View className="gap-3 py-6">
        <Notice tone="danger">{t('history.error')}</Notice>
        <Button variant="secondary" label={t('history.retry')} onPress={onRetry} />
      </View>
    );
  }
  return (
    <View className="items-center gap-2 py-10">
      <Inbox size={EMPTY_ICON_SIZE} color={colors.content.secondary} />
      <Text variant="label">{t('history.empty')}</Text>
    </View>
  );
}

/** First load: placeholder rows in the list area, shaped like HistoryRow. */
function LoadingRows() {
  const { t } = useTranslation();
  return (
    <View
      className="pt-4"
      accessibilityRole="progressbar"
      accessibilityLabel={t('history.loading')}
    >
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

function Footer(props: {
  isLoading: boolean;
  hasMore: boolean;
  hasItems: boolean;
  onMore: () => void;
}) {
  const { t } = useTranslation();
  if (props.isLoading) {
    return (
      <View className="items-center py-4">
        <Spinner size="small" label={t('history.loading')} />
      </View>
    );
  }
  if (!props.hasItems) return null;
  if (props.hasMore) {
    return <Button variant="ghost" label={t('history.loadMore')} onPress={props.onMore} />;
  }
  return (
    <Text variant="caption" tone="secondary" className="py-4 text-center">
      {t('history.end')}
    </Text>
  );
}

/**
 * History tab: every account's transactions or one account's, grouped by day, pull to refresh,
 * older pages on scroll or on request.
 */
export function HistoryList({ filter, onFilterChange }: HistoryListProps) {
  const colors = useThemeColors();
  const { t, i18n } = useTranslation();
  const { items, status, hasMore, isFirstLoad, loadMore, refresh } = useHistory(filter);
  const accounts = useAccountsByAddress();
  const sections = useMemo(
    () =>
      groupByDay(items, i18n.language, {
        today: t('history.today'),
        yesterday: t('history.yesterday'),
      }),
    [items, i18n.language, t],
  );
  const isBusy = isFirstLoad || status === 'loading';
  const hasItems = items.length > 0;
  // A pull shows the RefreshControl spinner only; it ends when the reloaded first page arrives.
  const [isPullRefresh, setIsPullRefresh] = useState(false);
  if (isPullRefresh && !isBusy) setIsPullRefresh(false);
  const isRefreshing = isPullRefresh && isBusy;

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => `${item.hash}:${item.owner}`}
      renderItem={({ item }) => <HistoryRow item={item} account={accounts.get(item.owner)} />}
      renderSectionHeader={({ section }) => (
        <Text
          variant="label"
          tone="secondary"
          className="bg-surface pb-1 pt-4"
          accessibilityRole="header"
        >
          {section.title}
        </Text>
      )}
      ListHeaderComponent={<Header filter={filter} onFilterChange={onFilterChange} />}
      ListEmptyComponent={
        isRefreshing ? undefined : isBusy ? (
          <LoadingRows />
        ) : (
          <Empty isError={status === 'error'} onRetry={loadMore} />
        )
      }
      ListFooterComponent={
        <Footer
          isLoading={isBusy && hasItems && !isRefreshing}
          hasMore={hasMore}
          hasItems={hasItems}
          onMore={loadMore}
        />
      }
      onEndReached={() => {
        if (hasMore && !isBusy && hasItems) loadMore();
      }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => {
            setIsPullRefresh(true);
            refresh();
          }}
          tintColor={colors.accent.DEFAULT}
          colors={[colors.accent.DEFAULT]}
        />
      }
      contentContainerClassName="px-6 pb-8 pt-4"
      stickySectionHeadersEnabled
    />
  );
}
