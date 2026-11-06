import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { useBalanceStore } from '@/entities/account';
import { BALANCE_POLL_INTERVAL_MS } from '@/shared/config';

import { useBalancePolling } from './use-balance-polling';

const ADDRESS = '0x0000000000000000000000000000000000000001';

type ChangeListener = (state: AppStateStatus) => void;

function mockAppState(initial: AppStateStatus) {
  let listener: ChangeListener | null = null;
  const remove = jest.fn();
  // The RN Jest setup mocks currentState as a function; replace it with a real state string.
  Object.defineProperty(AppState, 'currentState', { value: initial, configurable: true });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    listener = handler as ChangeListener;
    return { remove };
  });
  const emit = (state: AppStateStatus) => act(() => listener?.(state));
  return { emit, remove };
}

async function tick(intervals: number) {
  await act(() => jest.advanceTimersByTime(BALANCE_POLL_INTERVAL_MS * intervals));
}

const refresh = jest.fn<Promise<void>, [string]>(async () => undefined);
const originalCurrentState = Object.getOwnPropertyDescriptor(AppState, 'currentState');

beforeEach(() => {
  jest.useFakeTimers();
  refresh.mockClear();
  useBalanceStore.setState({ refresh });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  if (originalCurrentState) Object.defineProperty(AppState, 'currentState', originalCurrentState);
});

describe('useBalancePolling', () => {
  it('refreshes immediately and on every interval while active', async () => {
    mockAppState('active');
    await renderHook(() => useBalancePolling(ADDRESS));
    expect(refresh).toHaveBeenCalledTimes(1);
    await tick(2);
    expect(refresh).toHaveBeenCalledTimes(3);
    expect(refresh).toHaveBeenCalledWith(ADDRESS);
  });

  it('pauses in the background and refreshes at once on resume', async () => {
    const appState = mockAppState('active');
    await renderHook(() => useBalancePolling(ADDRESS));
    await appState.emit('background');
    await tick(5);
    expect(refresh).toHaveBeenCalledTimes(1);

    await appState.emit('active');
    expect(refresh).toHaveBeenCalledTimes(2);
    await tick(1);
    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it('treats inactive as paused too', async () => {
    const appState = mockAppState('active');
    await renderHook(() => useBalancePolling(ADDRESS));
    await appState.emit('inactive');
    await tick(3);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does not fetch when mounted in the background', async () => {
    mockAppState('background');
    await renderHook(() => useBalancePolling(ADDRESS));
    await tick(2);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('stops polling and unsubscribes on unmount', async () => {
    const appState = mockAppState('active');
    const { unmount } = await renderHook(() => useBalancePolling(ADDRESS));
    await act(() => unmount());
    await tick(3);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(appState.remove).toHaveBeenCalledTimes(1);
  });
});
