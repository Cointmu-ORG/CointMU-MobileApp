import { render, screen } from '@testing-library/react-native';
import { registerCSS, setupAllComponents } from 'react-native-css-interop/test';
import { View } from 'react-native';

import { buildThemeColors } from './build-theme';
import { ThemeRoot, useThemeColors, type Theme } from './theme-root';

// The rules Tailwind v3 emits for these classes with the variable-based colors in
// tailwind.config.js, compiled here by css-interop the way Metro does for the app.
const CSS = `
.bg-primary-600 { --tw-bg-opacity: 1; background-color: rgb(var(--color-primary-600) / var(--tw-bg-opacity)); }
.bg-surface { --tw-bg-opacity: 1; background-color: rgb(var(--color-surface) / var(--tw-bg-opacity)); }
`;

const theme = (scheme: Theme['scheme'], accent: Parameters<typeof buildThemeColors>[1]): Theme => ({
  scheme,
  colors: buildThemeColors(scheme, accent),
});

function Probe() {
  const colors = useThemeColors();
  return (
    <>
      <View testID="fill" className="bg-primary-600" />
      <View testID="surface" className="bg-surface" />
      <View testID="hook" accessibilityLabel={colors.accent.DEFAULT} />
    </>
  );
}

const background = (testID: string): unknown =>
  (screen.getByTestId(testID).props.style as { backgroundColor?: unknown }).backgroundColor;

describe('ThemeRoot', () => {
  beforeAll(() => {
    // Registering every component touches React Native's deprecated ImageBackground getter.
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    setupAllComponents();
    warn.mockRestore();
  });

  beforeEach(() => registerCSS(CSS));

  it('resolves color classes from the root variables and follows a theme change', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const view = await render(
      <ThemeRoot theme={theme('light', 'blue')}>
        <Probe />
      </ThemeRoot>,
    );
    expect(background('fill')).toBe('rgba(37, 99, 235, 1)');
    expect(background('surface')).toBe('rgba(248, 250, 252, 1)');

    await view.rerender(
      <ThemeRoot theme={theme('dark', 'purple')}>
        <Probe />
      </ThemeRoot>,
    );
    expect(background('fill')).toBe('rgba(147, 51, 234, 1)');
    expect(background('surface')).toBe('rgba(3, 7, 18, 1)');
    expect(screen.getByTestId('hook').props.accessibilityLabel).toBe(
      buildThemeColors('dark', 'purple').accent.DEFAULT,
    );
    // D-63: changing the values must not make css-interop upgrade (remount) a view.
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    warn.mockRestore();
    error.mockRestore();
  });

  it('gives code outside a ThemeRoot the light default palette', async () => {
    await render(<Probe />);
    expect(screen.getByTestId('hook').props.accessibilityLabel).toBe(
      buildThemeColors('light', 'blue').accent.DEFAULT,
    );
  });
});
