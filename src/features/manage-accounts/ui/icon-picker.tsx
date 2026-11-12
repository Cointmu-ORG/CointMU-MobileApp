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
  type AccountEmojiGroupId,
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

const CHIP_PALETTE = {
  selected: CELL_PALETTE.selected,
  unselected: {
    idle: 'border-2 border-border bg-surface-card',
    hovered: 'border-2 border-border bg-surface',
    pressed: 'border-2 border-border bg-surface-muted',
  },
} as const satisfies Record<string, SurfacePalette>;

const LUCIDE_ICONS: readonly AccountIcon[] = ACCOUNT_LUCIDE_NAMES.map((name) => ({
  kind: 'lucide',
  name,
}));
const GLYPH_SIZE = 24;

function isSameIcon(a: AccountIcon, b: AccountIcon): boolean {
  if (a.kind === 'lucide') return b.kind === 'lucide' && a.name === b.name;
  return b.kind === 'emoji' && a.value === b.value;
}

/** The group that holds an emoji, so the picker opens where the current choice is. */
function groupOf(icon: AccountIcon): AccountEmojiGroupId {
  const group = ACCOUNT_EMOJI_GROUPS.find(
    ({ emoji }) => icon.kind === 'emoji' && (emoji as readonly string[]).includes(icon.value),
  );
  return (group ?? ACCOUNT_EMOJI_GROUPS[0]).id;
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

type GroupChipsProps = { value: AccountEmojiGroupId; onChange: (id: AccountEmojiGroupId) => void };

/** The emoji groups as chips that wrap, so no label is cut off at a large text size. */
function GroupChips({ value, onChange }: GroupChipsProps) {
  const { t } = useTranslation();
  return (
    <View className="flex-row flex-wrap gap-2">
      {ACCOUNT_EMOJI_GROUPS.map(({ id }) => {
        const isSelected = id === value;
        return (
          <PressableSurface
            key={id}
            palette={isSelected ? CHIP_PALETTE.selected : CHIP_PALETTE.unselected}
            className="min-h-11 items-center justify-center rounded-full px-3"
            onPress={() => onChange(id)}
            accessibilityRole="button"
            accessibilityLabel={t(`wallets.icons.groups.${id}`)}
            accessibilityState={{ selected: isSelected }}
          >
            <Text variant="label" tone={isSelected ? 'primary' : 'secondary'}>
              {t(`wallets.icons.groups.${id}`)}
            </Text>
          </PressableSurface>
        );
      })}
    </View>
  );
}

/**
 * Picks an account card's icon (D-84): a tab of line icons and a tab of emoji by group. Both
 * lists are fixed; there is no text input. It opens on the tab and group of the current icon.
 */
export function IconPicker({ value, onChange }: IconPickerProps) {
  const { t } = useTranslation();
  const current = resolveAccountIcon(value);
  const [tab, setTab] = useState<Tab>(current.kind);
  const [groupId, setGroupId] = useState<AccountEmojiGroupId>(() => groupOf(current));
  const group = ACCOUNT_EMOJI_GROUPS.find(({ id }) => id === groupId) ?? ACCOUNT_EMOJI_GROUPS[0];

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
        <>
          <GroupChips value={groupId} onChange={setGroupId} />
          <IconGrid
            icons={group.emoji.map((emoji) => ({ kind: 'emoji', value: emoji }))}
            value={current}
            onChange={onChange}
            label={t(`wallets.icons.groups.${group.id}`)}
          />
        </>
      )}
    </View>
  );
}
