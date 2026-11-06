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
const TONE_CLASS = {
  default: 'text-content',
  secondary: 'text-content-secondary',
  muted: 'text-content-muted',
  primary: 'text-primary-600',
  inverse: 'text-content-inverse',
  danger: 'text-danger',
  success: 'text-success',
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
