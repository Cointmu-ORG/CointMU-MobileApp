import { SURFACE_PALETTE, type SurfacePalette } from './pressable-surface';
import { SEGMENT_PALETTE } from './segmented-control';

/**
 * Utilities that make css-interop upgrade (remount) a view when they first appear after the
 * first render: they set CSS variables, animate, mark a container or need a Pressable.
 */
const UPGRADE_FAMILIES: Record<string, RegExp> = {
  shadow: /^shadow(-|$)/,
  ring: /^ring(-|$)/,
  transform: /^-?(translate|scale|rotate|skew)-/,
  filter:
    /^(backdrop-)?(blur|brightness|contrast|grayscale|hue-rotate|invert|saturate|sepia|drop-shadow)(-|$)/,
  motion: /^(transition|animate|duration|delay|ease)(-|$)/,
  container: /^@?container(\/|$)/,
};
const VARIANT_FAMILY = 'variant';

function upgradeFamilies(classNames: string): string[] {
  const families = new Set<string>();
  for (const className of classNames.split(/\s+/).filter(Boolean)) {
    // A variant (`active:`, `hover:`, `focus:`) needs an upgrade whatever the utility is.
    if (className.includes(':')) families.add(VARIANT_FAMILY);
    const utility = className.slice(className.lastIndexOf(':') + 1);
    for (const [family, pattern] of Object.entries(UPGRADE_FAMILIES)) {
      if (pattern.test(utility)) families.add(family);
    }
  }
  return [...families].sort();
}

function stateFamilies(palette: SurfacePalette): string[][] {
  return [palette.idle, palette.hovered, palette.pressed].map(upgradeFamilies);
}

/** Palettes a single view can move between after its first render. */
const SWITCHABLE_GROUPS: Record<string, readonly SurfacePalette[]> = {
  'SURFACE_PALETTE (Button variants)': Object.values(SURFACE_PALETTE),
  'SEGMENT_PALETTE (selected and unselected)': Object.values(SEGMENT_PALETTE),
};

describe('upgradeFamilies', () => {
  it('names the families a class string belongs to', () => {
    expect(upgradeFamilies('bg-surface-card shadow-sm')).toEqual(['shadow']);
    expect(upgradeFamilies('bg-transparent shadow-none')).toEqual(['shadow']);
    expect(upgradeFamilies('active:bg-primary-50 scale-95 transition-colors')).toEqual([
      'motion',
      'transform',
      'variant',
    ]);
  });

  it('ignores plain color, border and layout classes', () => {
    expect(upgradeFamilies('border border-border bg-surface-card rounded-lg px-2')).toEqual([]);
  });
});

describe('surface palettes', () => {
  it.each(Object.entries(SWITCHABLE_GROUPS))(
    '%s use the same upgrade families in every state',
    (_name, palettes) => {
      const all = palettes.flatMap(stateFamilies);

      for (const families of all) expect(families).toEqual(all[0]);
    },
  );

  it('catches a palette that adds a shadow in one state only', () => {
    const broken: SurfacePalette = {
      idle: 'bg-transparent',
      hovered: 'bg-primary-50',
      pressed: 'bg-primary-50 shadow-sm',
    };

    const [idle, , pressed] = stateFamilies(broken);

    expect(pressed).not.toEqual(idle);
  });
});
