import { Text as NativeText, type TextProps as NativeTextProps } from 'react-native';

const VARIANT_CLASS = {
  title: 'text-3xl font-bold',
  heading: 'text-xl font-semibold',
  body: 'text-base',
  label: 'text-sm font-medium',
  caption: 'text-xs',
  button: 'text-base font-semibold',
  amount: 'text-4xl font-bold',
  mono: 'font-mono text-sm',
} as const;

// Color is separate from size so classes never conflict (NativeWind resolves by CSS order).
// Every tone meets WCAG AA (4.5:1) on white and on the surface color. `content.muted` is too
// light for text (2.6:1), so it is not a tone; status colors use their darker "strong" shade.
const TONE_CLASS = {
  default: 'text-content',
  secondary: 'text-content-secondary',
  primary: 'text-primary-600',
  inverse: 'text-content-inverse',
  danger: 'text-danger-strong',
  success: 'text-success-strong',
  warning: 'text-warning-strong',
} as const;

export type TextVariant = keyof typeof VARIANT_CLASS;
export type TextTone = keyof typeof TONE_CLASS;

export type TextProps = NativeTextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  className?: string;
};

export function Text({ variant = 'body', tone = 'default', className = '', ...props }: TextProps) {
  return (
    <NativeText
      className={`${VARIANT_CLASS[variant]} ${TONE_CLASS[tone]} ${className}`}
      {...props}
    />
  );
}
