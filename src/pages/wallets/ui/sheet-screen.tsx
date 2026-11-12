import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';

/**
 * Content of a form sheet. The ScrollView is the root so the sheet can grow to its larger detent
 * while the content scrolls; Android renders no native header inside a form sheet, so each sheet
 * starts with its own title.
 */
export function SheetScreen({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      className="flex-1 bg-surface-card"
      contentContainerClassName="gap-4 px-6 pb-10 pt-8"
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}
