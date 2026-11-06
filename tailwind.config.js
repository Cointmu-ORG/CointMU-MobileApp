// Design tokens ported from the desktop app (CointMU-App src/renderer/src/app/styles/index.css).
// Desktop is on Tailwind v4 (@theme); NativeWind v4 needs Tailwind v3, so values are copied (D-30).
// Light mode only (D-18). Spacing uses the Tailwind default scale, same as desktop.
const { platformSelect } = require('nativewind/theme');
const colors = require('./src/shared/ui/theme/colors.json');

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
