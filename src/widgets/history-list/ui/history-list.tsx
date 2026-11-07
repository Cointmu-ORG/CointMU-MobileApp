import Inbox from 'lucide-react-native/icons/inbox';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, SectionList, View } from 'react-native';

import { Button, colors, ICON_SIZE, Notice, Spinner, Text } from '@/shared/ui';

import { groupByDay } from '../lib/group-by-day';
import { useHistory } from '../model/use-history';
import { HistoryRow } from './history-row';

const EMPTY_ICON_SIZE = ICON_SIZE.lg * 2;

function Header() {
  const { t } = useTranslation();
  return (
    <View className="gap-2 pb-2">
      <Text variant="title" accessibilityRole="header">
        {t('history.title')}
      </Text>
      <Text variant="caption" tone="secondary">
        {t('history.help')}
      </Text>
    </View>
  );
}

function Empty({ isError, onRetry }: { isError: boolean; onRetry: () => void }) {
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

function Footer(props: {
  isLoading: boolean;
  hasMore: boolean;
  hasItems: boolean;
  onMore: () => void;
}) {
  const { t } = useTranslation();
  if (props.isLoading) return <Spinner size="small" label={t('history.loading')} />;
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

/** History tab: grouped by day, pull to refresh, older pages on scroll or on request. */
export function HistoryList() {
  const { t, i18n } = useTranslation();
  const { items, status, hasMore, isFirstLoad, loadMore, refresh } = useHistory();
  const sections = useMemo(
    () =>
      groupByDay(items, i18n.language, {
        today: t('history.today'),
        yesterday: t('history.yesterday'),
      }),
    [items, i18n.language, t],
  );
  const isLoading = status === 'loading';

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.hash}
      renderItem={({ item }) => <HistoryRow item={item} />}
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
      ListHeaderComponent={Header}
      ListEmptyComponent={
        isFirstLoad || isLoading ? undefined : (
          <Empty isError={status === 'error'} onRetry={loadMore} />
        )
      }
      ListFooterComponent={
        <Footer
          isLoading={isLoading}
          hasMore={hasMore}
          hasItems={items.length > 0}
          onMore={loadMore}
        />
      }
      onEndReached={() => {
        if (hasMore && !isLoading && items.length > 0) loadMore();
      }}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={refresh}
          tintColor={colors.primary[600]}
          colors={[colors.primary[600]]}
        />
      }
      contentContainerClassName="px-6 pb-8 pt-4"
      stickySectionHeadersEnabled
    />
  );
}
