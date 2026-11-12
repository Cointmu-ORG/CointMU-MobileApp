import type { LucideIcon } from 'lucide-react-native';
import Baby from 'lucide-react-native/icons/baby';
import Banknote from 'lucide-react-native/icons/banknote';
import Bike from 'lucide-react-native/icons/bike';
import BookOpen from 'lucide-react-native/icons/book-open';
import Briefcase from 'lucide-react-native/icons/briefcase';
import Car from 'lucide-react-native/icons/car';
import Coffee from 'lucide-react-native/icons/coffee';
import Coins from 'lucide-react-native/icons/coins';
import Flag from 'lucide-react-native/icons/flag';
import Gamepad2 from 'lucide-react-native/icons/gamepad-2';
import Gift from 'lucide-react-native/icons/gift';
import GraduationCap from 'lucide-react-native/icons/graduation-cap';
import Heart from 'lucide-react-native/icons/heart';
import HeartPulse from 'lucide-react-native/icons/heart-pulse';
import House from 'lucide-react-native/icons/house';
import KeyRound from 'lucide-react-native/icons/key-round';
import Landmark from 'lucide-react-native/icons/landmark';
import Music from 'lucide-react-native/icons/music';
import Palette from 'lucide-react-native/icons/palette';
import PawPrint from 'lucide-react-native/icons/paw-print';
import PiggyBank from 'lucide-react-native/icons/piggy-bank';
import Plane from 'lucide-react-native/icons/plane';
import Shield from 'lucide-react-native/icons/shield';
import Shirt from 'lucide-react-native/icons/shirt';
import ShoppingBag from 'lucide-react-native/icons/shopping-bag';
import ShoppingCart from 'lucide-react-native/icons/shopping-cart';
import Smartphone from 'lucide-react-native/icons/smartphone';
import Star from 'lucide-react-native/icons/star';
import Umbrella from 'lucide-react-native/icons/umbrella';
import Utensils from 'lucide-react-native/icons/utensils';
import Wallet from 'lucide-react-native/icons/wallet';
import WalletMinimal from 'lucide-react-native/icons/wallet-minimal';
import Wrench from 'lucide-react-native/icons/wrench';

/**
 * The icons a user can give an account card, in picker order. Keys are the lucide file names
 * and are what gets persisted: removing one makes stored cards fall back to the default icon,
 * renaming one needs a migration. Each key has a label under `wallets.icons.lucide` (en, id).
 */
export const ACCOUNT_LUCIDE_ICONS = {
  'wallet-minimal': WalletMinimal,
  wallet: Wallet,
  'key-round': KeyRound,
  'piggy-bank': PiggyBank,
  coins: Coins,
  banknote: Banknote,
  landmark: Landmark,
  shield: Shield,
  umbrella: Umbrella,
  house: House,
  car: Car,
  bike: Bike,
  plane: Plane,
  briefcase: Briefcase,
  'graduation-cap': GraduationCap,
  'book-open': BookOpen,
  'shopping-bag': ShoppingBag,
  'shopping-cart': ShoppingCart,
  shirt: Shirt,
  utensils: Utensils,
  coffee: Coffee,
  gift: Gift,
  heart: Heart,
  'heart-pulse': HeartPulse,
  baby: Baby,
  'paw-print': PawPrint,
  'gamepad-2': Gamepad2,
  music: Music,
  palette: Palette,
  smartphone: Smartphone,
  wrench: Wrench,
  star: Star,
  flag: Flag,
} as const satisfies Record<string, LucideIcon>;

export type AccountLucideName = keyof typeof ACCOUNT_LUCIDE_ICONS;

export const ACCOUNT_LUCIDE_NAMES = Object.keys(ACCOUNT_LUCIDE_ICONS) as AccountLucideName[];

/**
 * The emoji a user can give an account card, by group. Curated, never free text: every entry
 * is one grapheme without a joiner, a skin tone or a flag, and from Emoji 5.0 (2017) or older
 * so Android 8 and later draw it (`account-icon.test.ts` checks the shape). Group ids have a
 * label under `wallets.icons.groups` (en, id).
 */
export const ACCOUNT_EMOJI_GROUPS = [
  { id: 'money', emoji: ['💰', '💵', '💸', '💳', '🏦', '💎', '📈', '👛', '💼', '🏧'] },
  { id: 'places', emoji: ['🏠', '🏡', '🏢', '🏫', '🏥', '🏪', '🕌', '⛪', '🏕️', '🏝️'] },
  { id: 'travel', emoji: ['✈️', '🚗', '🛵', '🚌', '🚆', '🚲', '⛵', '🚀', '🗺️', '🏖️', '⛽'] },
  { id: 'food', emoji: ['🍔', '🍕', '🍜', '🍚', '🍩', '🍰', '🍎', '☕', '🍽️', '🛒'] },
  { id: 'hobbies', emoji: ['🎮', '🎵', '🎸', '🎬', '📚', '🎨', '📷', '⚽', '🎣', '🎁', '🎉'] },
  { id: 'family', emoji: ['👶', '🍼', '👪', '💍', '🐶', '🐱', '🐟', '🎓', '💊', '👕', '💐'] },
  {
    id: 'symbols',
    emoji: ['⭐', '❤️', '🔥', '⚡', '🌱', '🌙', '☔', '🔒', '🛡️', '🎯', '🔔', '🔧'],
  },
] as const;

export type AccountEmojiGroupId = (typeof ACCOUNT_EMOJI_GROUPS)[number]['id'];

export const ACCOUNT_EMOJI: ReadonlySet<string> = new Set(
  ACCOUNT_EMOJI_GROUPS.flatMap((group) => group.emoji),
);
