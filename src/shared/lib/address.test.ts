import { checkAddress, isSameAddress, shortenAddress } from './address';

const CHECKSUMMED = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

describe('checkAddress', () => {
  it('accepts a correctly checksummed address', () => {
    expect(checkAddress(CHECKSUMMED)).toEqual({ ok: true, address: CHECKSUMMED });
  });

  it('accepts all-lowercase and returns the checksummed form', () => {
    expect(checkAddress(` ${CHECKSUMMED.toLowerCase()} `)).toEqual({
      ok: true,
      address: CHECKSUMMED,
    });
  });

  it('rejects mixed case with a wrong checksum', () => {
    const typo = CHECKSUMMED.replace('Fd6', 'fD6');
    expect(checkAddress(typo)).toEqual({ ok: false, error: 'badChecksum' });
  });

  it.each(['', '0x123', 'f39Fd6e51aad88F6F4ce6aB8827279cffFb92266', `${CHECKSUMMED}00`, 'cmu.eth'])(
    'rejects %p as invalid',
    (input) => {
      expect(checkAddress(input)).toEqual({ ok: false, error: 'invalid' });
    },
  );
});

describe('address helpers', () => {
  it('shortens to the prefix and the last four characters', () => {
    expect(shortenAddress(CHECKSUMMED)).toBe('0xf39F…2266');
  });

  it('compares addresses case-insensitively', () => {
    expect(isSameAddress(CHECKSUMMED, CHECKSUMMED.toLowerCase())).toBe(true);
  });
});
