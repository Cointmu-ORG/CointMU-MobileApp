import { ACCOUNT_EMOJI, ACCOUNT_LUCIDE_ICONS } from '../config/account-icons';
import type { AccountIcon, WalletSource } from '../model/types';

/** What a card shows when its stored icon is missing, unknown or no longer offered. */
export const DEFAULT_ACCOUNT_ICON: AccountIcon = { kind: 'lucide', name: 'wallet-minimal' };

/** The icon a new account starts with: the one its card had before icons could be picked. */
export function defaultAccountIcon(source: WalletSource): AccountIcon {
  return source === 'private-key' ? { kind: 'lucide', name: 'key-round' } : DEFAULT_ACCOUNT_ICON;
}

export function isAccountIcon(value: unknown): value is AccountIcon {
  if (typeof value !== 'object' || value === null) return false;
  const icon = value as { kind?: unknown; name?: unknown; value?: unknown };
  if (icon.kind === 'lucide') {
    return typeof icon.name === 'string' && Object.hasOwn(ACCOUNT_LUCIDE_ICONS, icon.name);
  }
  return icon.kind === 'emoji' && typeof icon.value === 'string' && ACCOUNT_EMOJI.has(icon.value);
}

/** A stored icon if it is still one of the offered ones, otherwise the fallback. */
export function resolveAccountIcon(
  icon: unknown,
  fallback: AccountIcon = DEFAULT_ACCOUNT_ICON,
): AccountIcon {
  return isAccountIcon(icon) ? icon : fallback;
}
