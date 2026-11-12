import type { ColorScheme } from './build-theme';
import cardColors from './card-colors.json';
import { useTheme } from './theme-root';

/** A color the user can give an account card or a wallet (D-80). */
export type CardColorId = keyof typeof cardColors;

export const CARD_COLOR_IDS = [
  'ocean',
  'teal',
  'forest',
  'violet',
  'plum',
  'rose',
  'amber',
  'slate',
] as const satisfies readonly CardColorId[];

export const DEFAULT_CARD_COLOR: CardColorId = 'ocean';

export function isCardColorId(value: unknown): value is CardColorId {
  return typeof value === 'string' && (CARD_COLOR_IDS as readonly string[]).includes(value);
}

/** The palette in order, wrapping around: a default color for the nth wallet or account. */
export function cardColorAt(position: number): CardColorId {
  return CARD_COLOR_IDS[Math.abs(position) % CARD_COLOR_IDS.length] ?? DEFAULT_CARD_COLOR;
}

/**
 * The card fill for a scheme. Text and icons on it are always `content.inverse` (white), and a
 * badge on the card is the fill color on white; `card-colors.test.ts` keeps both at AA.
 */
export function cardFill(id: CardColorId, scheme: ColorScheme): string {
  return cardColors[id][scheme];
}

/** Resolves card color ids to fills for the active theme. */
export function useCardFill(): (id: CardColorId) => string {
  const { scheme } = useTheme();
  return (id) => cardFill(id, scheme);
}
