import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet } from 'react-native';

import { Screen } from './screen';

/**
 * Scrollable screen for forms. Android apps are edge-to-edge, so the window no longer resizes
 * for the keyboard: without a `behavior` the fields and the submit button stay under it.
 */
export function FormScreen({ children }: { children: ReactNode }) {
  return (
    <Screen>
      <KeyboardAvoidingView behavior="padding" style={styles.fill}>
        <ScrollView
          contentContainerClassName="gap-6 pb-8"
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
