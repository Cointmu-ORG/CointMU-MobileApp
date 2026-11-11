// Design tokens ported from the desktop app (CointMU-App src/renderer/src/app/styles/index.css).
// Desktop is on Tailwind v4 (@theme); NativeWind v4 needs Tailwind v3, so values are copied (D-30).
// Every color is a CSS variable set on the root view (ThemeRoot), so one class follows the
// light/dark theme and the accent at runtime (D-66). colors.json only lists the token names here;
// the values live in src/shared/ui/theme. Spacing uses the Tailwind default scale, same as desktop.
const { platformSelect } = require('nativewind/theme');
const tokens = require('./src/shared/ui/theme/colors.json');

const colors = Object.fromEntries(
  Object.entries(tokens).map(([group, keys]) => [
    group,
    Object.fromEntries(
      Object.keys(keys).map((key) => {
        const name = key === 'DEFAULT' ? group : `${group}-${key}`;
        return [key, `rgb(var(--color-${name}) / <alpha-value>)`];
      }),
    ),
  ]),
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors,
      borderRadius: {
        control: '12px', // desktop buttons and inputs: rounded-xl
        card: '16px', // desktop .card-glass
      },
      fontFamily: {
        // Desktop names Inter but does not bundle it; mobile uses the system font.
        mono: platformSelect({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
      },
    },
  },
  plugins: [],
};
