const HEX_RADIX = 16;
const CHANNEL_MAX = 255;
const CHANNEL_OFFSETS = [1, 3, 5] as const;
const CHANNEL_HEX_LENGTH = 2;

export type Rgb = readonly [number, number, number];

/** Channels of a `#rrggbb` color. */
export function hexToRgb(hex: string): Rgb {
  const [r, g, b] = CHANNEL_OFFSETS.map((offset) =>
    parseInt(hex.slice(offset, offset + CHANNEL_HEX_LENGTH), HEX_RADIX),
  );
  return [r ?? 0, g ?? 0, b ?? 0];
}

function rgbToHex(rgb: Rgb): string {
  return `#${rgb.map((channel) => channel.toString(HEX_RADIX).padStart(CHANNEL_HEX_LENGTH, '0')).join('')}`;
}

/** `amount` of `foreground` painted over `background` (0 = background, 1 = foreground). */
export function mixHex(foreground: string, background: string, amount: number): string {
  const over = hexToRgb(foreground);
  const under = hexToRgb(background);
  const mixed = over.map((channel, index) =>
    Math.round(channel * amount + (under[index] ?? 0) * (1 - amount)),
  );
  return rgbToHex([mixed[0] ?? 0, mixed[1] ?? 0, mixed[2] ?? 0]);
}

// WCAG 2.x relative luminance (https://www.w3.org/TR/WCAG22/#dfn-relative-luminance).
const LINEAR_THRESHOLD = 0.03928;
const LINEAR_DIVISOR = 12.92;
const GAMMA_OFFSET = 0.055;
const GAMMA_DIVISOR = 1.055;
const GAMMA = 2.4;
const LUMINANCE_WEIGHTS = [0.2126, 0.7152, 0.0722] as const;
const CONTRAST_OFFSET = 0.05;

function relativeLuminance(hex: string): number {
  return hexToRgb(hex).reduce((sum, channel, index) => {
    const value = channel / CHANNEL_MAX;
    const linear =
      value <= LINEAR_THRESHOLD
        ? value / LINEAR_DIVISOR
        : ((value + GAMMA_OFFSET) / GAMMA_DIVISOR) ** GAMMA;
    return sum + linear * (LUMINANCE_WEIGHTS[index] ?? 0);
  }, 0);
}

/** WCAG contrast ratio of two `#rrggbb` colors, from 1 (same) to 21 (black on white). */
export function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return ((lighter ?? 0) + CONTRAST_OFFSET) / ((darker ?? 0) + CONTRAST_OFFSET);
}
