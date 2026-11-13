import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from './button';

const surfaceClass = () => String(screen.getByText('Save').parent?.props.className);

describe('Button', () => {
  it('shows a disabled filled button as a muted outline with the normal text color, not dimmed', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" onPress={onPress} isDisabled />);

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    // Dimming would take the label below AA; the muted surface keeps it at full contrast
    // (content on surface-muted is checked in theme/build-theme.test.ts).
    expect(surfaceClass()).toContain('bg-surface-muted');
    expect(surfaceClass()).not.toContain('opacity-50');
    expect(surfaceClass()).not.toContain('bg-primary-600');
    expect(String(screen.getByText('Save').props.className)).toContain('text-content ');

    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('keeps the action color and the inverse label while enabled', async () => {
    await render(<Button label="Save" onPress={jest.fn()} />);
    expect(surfaceClass()).toContain('bg-primary-600');
    expect(String(screen.getByText('Save').props.className)).toContain('text-content-inverse');
  });
});
