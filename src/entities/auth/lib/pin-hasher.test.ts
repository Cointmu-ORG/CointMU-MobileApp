import { PIN_KDF } from '../config/auth-config';
import { createPbkdf2PinHasher, pinHasher } from './pin-hasher';

// Low cost keeps the suite fast; the production cost lives in PIN_KDF.
const FAST_PARAMS = { ...PIN_KDF, iterations: 10 };

describe('pinHasher', () => {
  it('produces a versioned record and never stores the PIN', async () => {
    const record = await pinHasher.hash('123456');
    expect(record).toMatchObject({
      v: PIN_KDF.version,
      algo: PIN_KDF.algo,
      iterations: PIN_KDF.iterations,
    });
    expect(JSON.stringify(record)).not.toContain('123456');
  });

  it('verifies the right PIN and rejects a wrong one', async () => {
    const hasher = createPbkdf2PinHasher(FAST_PARAMS);
    const record = await hasher.hash('123456');
    await expect(hasher.verify('123456', record)).resolves.toBe(true);
    await expect(hasher.verify('123457', record)).resolves.toBe(false);
  });

  it('salts every hash', async () => {
    const hasher = createPbkdf2PinHasher(FAST_PARAMS);
    const [a, b] = await Promise.all([hasher.hash('123456'), hasher.hash('123456')]);
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });

  it('verifies old records with their own params and flags them for rehash', async () => {
    const oldRecord = await createPbkdf2PinHasher(FAST_PARAMS).hash('123456');
    const current = createPbkdf2PinHasher({ ...FAST_PARAMS, iterations: 20 });
    await expect(current.verify('123456', oldRecord)).resolves.toBe(true);
    expect(current.needsRehash(oldRecord)).toBe(true);
    expect(current.needsRehash(await current.hash('123456'))).toBe(false);
  });
});
