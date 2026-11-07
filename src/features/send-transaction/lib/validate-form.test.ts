import { NATIVE_ASSET } from '@/entities/asset';

import { validateSendForm } from './validate-form';

const TO = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

describe('validateSendForm', () => {
  it('returns the checksummed recipient and the amount in wei', () => {
    expect(
      validateSendForm({
        asset: NATIVE_ASSET,
        toInput: TO.toLowerCase(),
        amountInput: '0,5',
        locale: 'id-ID',
      }),
    ).toEqual({ ok: true, to: TO, amount: 5n * 10n ** 17n });
  });

  it('reports every field error at once', () => {
    expect(
      validateSendForm({ asset: NATIVE_ASSET, toInput: 'nope', amountInput: '0', locale: 'en-US' }),
    ).toEqual({ ok: false, errors: { to: 'invalid', amount: 'zero' } });
  });

  it('flags a bad checksum and too many decimals', () => {
    expect(
      validateSendForm({
        asset: NATIVE_ASSET,
        toInput: TO.replace('C51', 'c51'),
        amountInput: '0.0000000000000000001',
        locale: 'en-US',
      }),
    ).toEqual({ ok: false, errors: { to: 'badChecksum', amount: 'tooManyDecimals' } });
  });
});
