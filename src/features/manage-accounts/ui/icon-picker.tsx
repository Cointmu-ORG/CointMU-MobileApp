import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  ACCOUNT_EMOJI_GROUPS,
  ACCOUNT_LUCIDE_NAMES,
  AccountIconGlyph,
  accountIconTestId,
  resolveAccountIcon,
  useAccountIconLabel,
  type AccountIcon,
} from '@/entities/wallet';
import {
  PressableSurface,
  SegmentedControl,
  Text,
  useThemeColors,
  type SurfacePalette,
} from '@/shared/ui';

type IconPickerProps = {
  value: AccountIcon;
  onChange: (icon: AccountIcon) => void;
};

type Tab = AccountIcon['kind'];

// Selected is a border and a tint, not a color swap alone; both states keep the same classes
// families so a cell is never remounted when it becomes selected (D-63).
const CELL_PALETTE = {
  selected: {
    idle: 'border-2 border-accent bg-primary-50',
    hovered: 'border-2 border-accent bg-primary-50',
    pressed: 'border-2 border-accent bg-primary-100',
  },
  unselected: {
    idle: 'border-2 border-transparent bg-transparent',
    hovered: 'border-2 border-transparent bg-primary-50',
    pressed: 'border-2 border-transparent bg-primary-100',
  },
} as const satisfies Record<string, SurfacePalette>;

const LUCIDE_ICONS: readonly AccountIcon[] = ACCOUNT_LUCIDE_NAMES.map((name) => ({
  kind: 'lucide',
  name,
}));
const GLYPH_SIZE = 24;

export function isSameIcon(a: AccountIcon, b: AccountIcon): boolean {
  if (a.kind === 'lucide') return b.kind === 'lucide' && a.name === b.name;
  return b.kind === 'emoji' && a.value === b.value;
}

type IconGridProps = IconPickerProps & { icons: readonly AccountIcon[]; label: string };

/** A radio group of 48 dp cells; each cell is named for screen readers. */
function IconGrid({ icons, value, onChange, label }: IconGridProps) {
  const colors = useThemeColors();
  const labelOf = useAccountIconLabel();
  return (
    <View
      className="flex-row flex-wrap gap-1"
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
    >
      {icons.map((icon) => {
        const isSelected = isSameIcon(icon, value);
        return (
          <PressableSurface
            key={accountIconTestId(icon)}
            palette={isSelected ? CELL_PALETTE.selected : CELL_PALETTE.unselected}
            className="h-12 w-12 items-center justify-center rounded-control"
            onPress={() => onChange(icon)}
            accessibilityRole="radio"
            accessibilityLabel={labelOf(icon)}
            accessibilityState={{ selected: isSelected, checked: isSelected }}
          >
            <AccountIconGlyph
              icon={icon}
              size={GLYPH_SIZE}
              color={isSelected ? colors.accent.DEFAULT : colors.content.DEFAULT}
            />
          </PressableSurface>
        );
      })}
    </View>
  );
}

/**
 * Picks an account card's icon (D-84): a tab of line icons and a tab of emoji, every group in
 * full under its name. Both lists are fixed; there is no text input. The grid has no scroll of
 * its own: it is as tall as its content and scrolls with the page. It opens on the tab of the
 * current icon.
 */
export function IconPicker({ value, onChange }: IconPickerProps) {
  const { t } = useTranslation();
  const current = resolveAccountIcon(value);
  const [tab, setTab] = useState<Tab>(current.kind);

  return (
    <View className="gap-3">
      <SegmentedControl
        options={[
          { value: 'lucide', label: t('wallets.icons.tabs.lucide') },
          { value: 'emoji', label: t('wallets.icons.tabs.emoji') },
        ]}
        value={tab}
        onChange={setTab}
        accessibilityLabel={t('wallets.icons.label')}
      />
      {tab === 'lucide' ? (
        <IconGrid
          icons={LUCIDE_ICONS}
          value={current}
          onChange={onChange}
          label={t('wallets.icons.tabs.lucide')}
        />
      ) : (
        ACCOUNT_EMOJI_GROUPS.map((group) => (
          <View key={group.id} className="gap-1">
            <Text variant="caption" tone="secondary" accessibilityRole="header">
              {t(`wallets.icons.groups.${group.id}`)}
            </Text>
            <IconGrid
              icons={group.emoji.map((emoji) => ({ kind: 'emoji', value: emoji }))}
              value={current}
              onChange={onChange}
              label={t(`wallets.icons.groups.${group.id}`)}
            />
          </View>
        ))
      )}
    </View>
  );
}
