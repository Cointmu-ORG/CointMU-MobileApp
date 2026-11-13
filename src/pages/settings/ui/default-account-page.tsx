import { View } from 'react-native';

import { DefaultAccountPicker } from '@/features/manage-accounts';

/** Settings > Default account for transfers. The list scrolls inside the screen. */
export function DefaultAccountPage() {
  return (
    <View className="flex-1 bg-surface px-6 pt-4">
      <DefaultAccountPicker />
    </View>
  );
}
