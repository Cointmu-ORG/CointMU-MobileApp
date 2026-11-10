import { fireEvent, render, screen } from '@testing-library/react-native';

import { i18n } from '@/shared/i18n';

import { PinEntry } from './pin-entry';

const LENGTH = 6;

function renderEntry(props: Partial<Parameters<typeof PinEntry>[0]> = {}) {
  const onDigit = jest.fn();
  const onDelete = jest.fn();
  return {
    onDigit,
    onDelete,
    view: render(
      <PinEntry
        title="Enter your PIN"
        subtitle="To continue"
        length={LENGTH}
        filledCount={2}
        errorSignal={0}
        onDigit={onDigit}
        onDelete={onDelete}
        {...props}
      />,
    ),
  };
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

describe('PinEntry', () => {
  it('shows the header, the progress and a working keypad', async () => {
    const { onDigit, onDelete, view } = renderEntry({ error: 'Wrong PIN' });
    await view;
    expect(screen.getByRole('header', { name: 'Enter your PIN' })).toBeOnTheScreen();
    expect(screen.getByText('To continue')).toBeOnTheScreen();
    expect(screen.getByText('Wrong PIN')).toBeOnTheScreen();
    expect(screen.getByLabelText(`2 of ${LENGTH} digits entered`)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: '7' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    expect(onDigit).toHaveBeenCalledWith('7');
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Use biometrics' })).toBeNull();
  });

  it('shows the busy text instead of the error and disables every key', async () => {
    await renderEntry({ error: 'Wrong PIN', busyLabel: 'Checking your PIN' }).view;
    expect(screen.getByText('Checking your PIN')).toBeOnTheScreen();
    expect(screen.queryByText('Wrong PIN')).toBeNull();
    expect(screen.getByRole('button', { name: '1' })).toBeDisabled();
    expect(screen.getByLabelText(`${LENGTH} of ${LENGTH} digits entered`)).toBeOnTheScreen();
  });
});
