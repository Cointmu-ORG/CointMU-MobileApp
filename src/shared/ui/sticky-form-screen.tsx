import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';

import { Screen, useHeaderOffset } from './screen';

type StickyFormScreenProps = {
  /** Stays at the top while the form scrolls under it, e.g. a live preview. */
  top: ReactNode;
  /** Stays at the bottom, above the keyboard, e.g. the Save button. */
  bottom: ReactNode;
  children: ReactNode;
  /** Finds the scrolling part in tests. */
  scrollTestID?: string;
};

/**
 * A form screen with a fixed top and a fixed bottom: only the fields in between scroll, so a
 * preview and the submit button are on screen however long the form is. Nothing is behind a
 * gesture other than the page scroll.
 */
export function StickyFormScreen({ top, bottom, children, scrollTestID }: StickyFormScreenProps) {
  const headerOffset = useHeaderOffset();
  return (
    <Screen>
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={headerOffset}
        style={styles.fill}
      >
        <View className="pb-4">{top}</View>
        <ScrollView
          testID={scrollTestID}
          style={styles.fill}
          contentContainerClassName="gap-6 pb-4"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        <View className="border-t border-border pt-3">{bottom}</View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
