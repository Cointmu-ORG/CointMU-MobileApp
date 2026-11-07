import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { getAssetKey, useVisibleAssets, type Asset } from '@/entities/asset';
import { PressableSurface, SURFACE_PALETTE, Text } from '@/shared/ui';

type AssetPickerProps = {
  selectedKey: string;
  onSelect: (asset: Asset) => void;
};

/** One chip per sendable asset; a radio group for screen readers. */
export function AssetPicker({ selectedKey, onSelect }: AssetPickerProps) {
  const { t } = useTranslation();
  const assets = useVisibleAssets();
  if (assets.length < 2) return null;
  return (
    <View className="gap-2">
      <Text variant="label" tone="secondary">
        {t('send.form.asset')}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="radiogroup">
        <View className="flex-row gap-2">
          {assets.map((asset) => {
            const key = getAssetKey(asset);
            const isSelected = key === selectedKey;
            return (
              <PressableSurface
                key={key}
                palette={isSelected ? SURFACE_PALETTE.primary : SURFACE_PALETTE.secondary}
                className="min-h-12 justify-center rounded-full px-5"
                onPress={() => onSelect(asset)}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={asset.symbol}
              >
                <Text variant="label" tone={isSelected ? 'inverse' : 'primary'}>
                  {asset.symbol}
                </Text>
              </PressableSurface>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
