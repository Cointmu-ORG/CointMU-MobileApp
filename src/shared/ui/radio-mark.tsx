import { View } from 'react-native';

/** Visual radio indicator for list rows; the row carries the radio role and checked state. */
export function RadioMark({ isSelected }: { isSelected: boolean }) {
  return (
    <View
      className={`h-5 w-5 items-center justify-center rounded-full border-2 ${
        isSelected ? 'border-primary-600' : 'border-content-secondary'
      }`}
    >
      {isSelected ? <View className="h-2.5 w-2.5 rounded-full bg-primary-600" /> : null}
    </View>
  );
}
