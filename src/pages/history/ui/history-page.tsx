import { SafeAreaView } from 'react-native-safe-area-context';

import { HistoryList } from '@/widgets/history-list';

export function HistoryPage() {
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'left', 'right']}>
      <HistoryList />
    </SafeAreaView>
  );
}
