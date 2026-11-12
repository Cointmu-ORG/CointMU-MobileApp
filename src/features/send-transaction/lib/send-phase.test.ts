import type { TxStatus } from '@/entities/transaction';

import {
  coinPosition,
  isSuccessPhase,
  resolveSendPhase,
  ringProgress,
  stepStates,
  type SendPhase,
} from './send-phase';

const SENT = { ok: true, isUncertain: false };
const UNCERTAIN = { ok: true, isUncertain: true };
const FINAL_CONFIRMATIONS = 12;

describe('resolveSendPhase', () => {
  it('is "sending" until the send call returns, whatever else is known', () => {
    expect(resolveSendPhase({ outcome: null, status: null })).toBe('sending');
    expect(resolveSendPhase({ outcome: null, status: 'confirmed' })).toBe('sending');
  });

  it('is "notSent" when the send failed', () => {
    expect(resolveSendPhase({ outcome: { ok: false }, status: null })).toBe('notSent');
  });

  it.each<[TxStatus | null, SendPhase]>([
    [null, 'broadcast'],
    ['pending', 'broadcast'],
    ['confirmed', 'confirmed'],
    ['final', 'final'],
    ['failed', 'reverted'],
    ['dropped', 'dropped'],
    ['replaced', 'replaced'],
  ])('an accepted broadcast with status %s is %s', (status, phase) => {
    expect(resolveSendPhase({ outcome: SENT, status })).toBe(phase);
  });

  it('keeps a timed-out broadcast uncertain until the poller settles it', () => {
    expect(resolveSendPhase({ outcome: UNCERTAIN, status: 'pending' })).toBe('uncertain');
    expect(resolveSendPhase({ outcome: UNCERTAIN, status: 'confirmed' })).toBe('confirmed');
    expect(resolveSendPhase({ outcome: UNCERTAIN, status: 'dropped' })).toBe('dropped');
  });
});

describe('visual state of a phase', () => {
  const BEFORE_CONFIRMED: readonly SendPhase[] = ['sending', 'notSent', 'broadcast', 'uncertain'];
  const NOT_SUCCESS: readonly SendPhase[] = ['reverted', 'dropped', 'replaced'];

  it('has success styling only for confirmed and final', () => {
    for (const phase of [...BEFORE_CONFIRMED, ...NOT_SUCCESS]) {
      expect(isSuccessPhase(phase)).toBe(false);
    }
    expect(isSuccessPhase('confirmed')).toBe(true);
    expect(isSuccessPhase('final')).toBe(true);
  });

  it('moves the coin to the recipient only once the node accepted the transaction', () => {
    expect(coinPosition('sending')).toBe(0);
    expect(coinPosition('notSent')).toBe(0);
    expect(coinPosition('uncertain')).toBeGreaterThan(0);
    expect(coinPosition('uncertain')).toBeLessThan(1);
    expect(coinPosition('broadcast')).toBe(1);
    expect(coinPosition('confirmed')).toBe(1);
    expect(coinPosition('dropped')).toBe(0);
  });

  it('fills the ring from the confirmations and never before a block', () => {
    expect(ringProgress('sending', 0, FINAL_CONFIRMATIONS)).toBe(0);
    expect(ringProgress('broadcast', 0, FINAL_CONFIRMATIONS)).toBe(0);
    expect(ringProgress('confirmed', 3, FINAL_CONFIRMATIONS)).toBeCloseTo(0.25);
    expect(ringProgress('confirmed', 40, FINAL_CONFIRMATIONS)).toBe(1);
    expect(ringProgress('final', 12, FINAL_CONFIRMATIONS)).toBe(1);
    expect(ringProgress('reverted', 5, FINAL_CONFIRMATIONS)).toBe(0);
  });

  it('marks a step done only when it happened', () => {
    expect(stepStates('sending')).toEqual(['current', 'waiting', 'waiting']);
    expect(stepStates('uncertain')).toEqual(['current', 'waiting', 'waiting']);
    expect(stepStates('broadcast')).toEqual(['done', 'current', 'waiting']);
    expect(stepStates('confirmed')).toEqual(['done', 'done', 'current']);
    expect(stepStates('final')).toEqual(['done', 'done', 'done']);
  });
});
