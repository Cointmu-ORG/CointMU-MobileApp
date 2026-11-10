import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet } from 'react-native';

import { Screen, useHeaderOffset } from './screen';

/**
 * Scrollable screen for forms. The content grows to the screen height, so a `flex-1` child
 * (the PIN layout, a centered progress state) fills it like on a plain Screen. Android apps are edge-to-edge, so the window no longer resizes
 * for the keyboard: without a `behavior` the fields and the submit button stay under it.
 */
export function FormScreen({ children }: { children: ReactNode }) {
  const headerOffset = useHeaderOffset();
  return (
    <Screen>
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={headerOffset}
        style={styles.fill}
      >
        <ScrollView
          contentContainerClassName="grow gap-6 pb-8"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
