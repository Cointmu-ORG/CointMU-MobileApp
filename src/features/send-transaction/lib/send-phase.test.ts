import type { TxStatus } from '@/entities/transaction';

import {
  isSuccessPhase,
  phaseTxStatus,
  resolveSendPhase,
  stepStates,
  type SendPhase,
} from './send-phase';

const SENT = { ok: true, isUncertain: false };
const UNCERTAIN = { ok: true, isUncertain: true };

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

  it.each<[SendPhase, TxStatus | null]>([
    ['sending', null],
    ['notSent', null],
    ['broadcast', 'pending'],
    ['uncertain', 'pending'],
    ['confirmed', 'confirmed'],
    ['final', 'final'],
    ['reverted', 'failed'],
    ['dropped', 'dropped'],
    ['replaced', 'replaced'],
  ])('%s shows the status chip %s', (phase, status) => {
    expect(phaseTxStatus(phase)).toBe(status);
  });

  it('marks a step done only when it happened', () => {
    expect(stepStates('sending')).toEqual(['current', 'waiting', 'waiting']);
    expect(stepStates('uncertain')).toEqual(['current', 'waiting', 'waiting']);
    expect(stepStates('broadcast')).toEqual(['done', 'current', 'waiting']);
    expect(stepStates('confirmed')).toEqual(['done', 'done', 'current']);
    expect(stepStates('final')).toEqual(['done', 'done', 'done']);
  });
});
