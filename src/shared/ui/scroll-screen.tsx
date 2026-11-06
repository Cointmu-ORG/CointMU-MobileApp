import type { ReactElement, ReactNode } from 'react';
import { ScrollView, type RefreshControlProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScrollScreenProps = {
  children: ReactNode;
  refreshControl?: ReactElement<RefreshControlProps>;
};

/** Scrollable screen. Children animate themselves (e.g. staggered Cards). */
export function ScrollScreen({ children, refreshControl }: ScrollScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerClassName="gap-4 px-6 py-4"
        refreshControl={refreshControl}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
