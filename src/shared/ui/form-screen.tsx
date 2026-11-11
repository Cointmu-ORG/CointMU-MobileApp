import type { ReactElement, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  type RefreshControlProps,
} from 'react-native';

import { Screen, useHeaderOffset } from './screen';

/**
 * Scrollable screen for forms. The content grows to the screen height, so a `flex-1` child
 * (the PIN layout, a centered progress state) fills it like on a plain Screen. Android apps are edge-to-edge, so the window no longer resizes
 * for the keyboard: without a `behavior` the fields and the submit button stay under it.
 */
type FormScreenProps = {
  children: ReactNode;
  /** Pull-to-refresh for screens that show live data (the node list). */
  refreshControl?: ReactElement<RefreshControlProps>;
};

export function FormScreen({ children, refreshControl }: FormScreenProps) {
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
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
