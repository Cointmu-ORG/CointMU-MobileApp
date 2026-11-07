import { ERC20, NATIVE_ASSET, type Erc20Asset } from '@/entities/asset';

import { buildTxRequest, checkFunds, maxSendable } from './send-math';

const FROM = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const TO = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const TOKEN: Erc20Asset = {
  kind: 'erc20',
  address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  symbol: 'TKN',
  decimals: 6,
  name: null,
  source: 'custom',
};
const FEE = 21n;

describe('buildTxRequest', () => {
  it('sends native value straight to the recipient', () => {
    expect(buildTxRequest({ asset: NATIVE_ASSET, from: FROM, to: TO, amount: 5n })).toEqual({
      from: FROM,
      to: TO,
      value: 5n,
      data: '0x',
    });
  });

  it('calls transfer(to, amount) on the token contract with no value', () => {
    const request = buildTxRequest({ asset: TOKEN, from: FROM, to: TO, amount: 5n });
    expect(request).toMatchObject({ to: TOKEN.address, value: 0n });
    expect(ERC20.decodeFunctionData('transfer', request.data).toArray()).toEqual([TO, 5n]);
  });
});

describe('checkFunds (fee included)', () => {
  it('needs amount + fee for native CMU', () => {
    const base = { asset: NATIVE_ASSET, maxFee: FEE, tokenBalance: null };
    expect(checkFunds({ ...base, amount: 79n, nativeBalance: 100n })).toBe('ok');
    expect(checkFunds({ ...base, amount: 80n, nativeBalance: 100n })).toBe('insufficientFunds');
  });

  it('checks the token balance and the CMU for gas separately', () => {
    const base = { asset: TOKEN, maxFee: FEE, amount: 50n };
    expect(checkFunds({ ...base, nativeBalance: FEE, tokenBalance: 50n })).toBe('ok');
    expect(checkFunds({ ...base, nativeBalance: FEE, tokenBalance: 49n })).toBe(
      'insufficientFunds',
    );
    expect(checkFunds({ ...base, nativeBalance: FEE - 1n, tokenBalance: 50n })).toBe(
      'insufficientGas',
    );
    expect(checkFunds({ ...base, nativeBalance: FEE, tokenBalance: null })).toBe(
      'insufficientFunds',
    );
  });
});

describe('maxSendable', () => {
  it('leaves the fee for native CMU and never goes negative', () => {
    expect(
      maxSendable({ asset: NATIVE_ASSET, maxFee: FEE, nativeBalance: 100n, tokenBalance: null }),
    ).toBe(79n);
    expect(
      maxSendable({ asset: NATIVE_ASSET, maxFee: FEE, nativeBalance: 10n, tokenBalance: null }),
    ).toBe(0n);
  });

  it('uses the whole token balance (the fee is paid in CMU)', () => {
    expect(maxSendable({ asset: TOKEN, maxFee: FEE, nativeBalance: 0n, tokenBalance: 7n })).toBe(
      7n,
    );
  });
});
