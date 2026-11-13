import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HistoryList } from '@/widgets/history-list';

/** The History tab. `owner` in the route is the address of the one account shown; public data. */
export function HistoryPage() {
  const { owner } = useLocalSearchParams<{ owner?: string }>();
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'left', 'right']}>
      <HistoryList
        filter={owner ?? null}
        onFilterChange={(address) => router.setParams({ owner: address ?? undefined })}
      />
    </SafeAreaView>
  );
}
