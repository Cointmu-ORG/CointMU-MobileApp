import type { ReactNode } from 'react';
import { View } from 'react-native';

/**
 * Content of a short action sheet. The sheet is as tall as this view (`fitToContents`), so
 * everything in it is on screen without dragging: there is no scroll view and nothing may be
 * added here that could outgrow a small phone. Anything longer is a page. Android renders no
 * native header inside a form sheet, so each sheet starts with its own title.
 */
export function SheetScreen({ children }: { children: ReactNode }) {
  return <View className="gap-4 bg-surface-card px-6 pb-10 pt-8">{children}</View>;
}
