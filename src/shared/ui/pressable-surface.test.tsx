import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { Text } from 'react-native';

import { PressableSurface, SURFACE_PALETTE } from './pressable-surface';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light' },
}));

async function renderSurface(isDisabled = false) {
  const onPress = jest.fn();
  await render(
    <PressableSurface
      palette={SURFACE_PALETTE.primary}
      onPress={onPress}
      isDisabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel="Go"
    >
      <Text>Go</Text>
    </PressableSurface>,
  );
  return { onPress, button: screen.getByRole('button', { name: 'Go' }) };
}

beforeEach(() => jest.mocked(Haptics.impactAsync).mockClear());

describe('PressableSurface', () => {
  it('presses with a light haptic', async () => {
    const { onPress, button } = await renderSurface();
    await fireEvent(button, 'pressIn');
    await fireEvent.press(button);
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is disabled for presses and screen readers', async () => {
    const { onPress, button } = await renderSurface(true);
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });

  it('shows a focus ring only while focused', async () => {
    const { button } = await renderSurface();
    const surface = () => screen.getByText('Go').parent;
    expect(surface()?.props.style).toBeUndefined();
    await fireEvent(button, 'focus');
    expect(surface()?.props.style).toMatchObject({ outlineWidth: 2 });
    await fireEvent(button, 'blur');
    expect(surface()?.props.style).toBeUndefined();
  });
});
