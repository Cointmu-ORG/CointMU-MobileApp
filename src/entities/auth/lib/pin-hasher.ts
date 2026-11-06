import { hexlify, pbkdf2, randomBytes, toUtf8Bytes } from 'ethers';

import { PIN_KDF } from '../config/auth-config';

/** Versioned record stored in SecureStore. Verification always uses the record's own params. */
export type PinRecord = {
  readonly v: number;
  readonly algo: 'pbkdf2-sha256';
  readonly iterations: number;
  readonly salt: string;
  readonly hash: string;
};

export type PinKdfParams = {
  readonly version: number;
  readonly algo: 'pbkdf2-sha256';
  readonly iterations: number;
  readonly saltBytes: number;
  readonly keyBytes: number;
};

/** The one interface PIN hashing goes through, so the KDF can change (Q-32). */
export interface PinHasher {
  hash(pin: string): Promise<PinRecord>;
  verify(pin: string, record: PinRecord): Promise<boolean>;
  /** True when the record was made with different params than the current config. */
  needsRehash(record: PinRecord): boolean;
}

const HEX_PREFIX_LENGTH = 2;
const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function keyLengthOf(record: PinRecord): number {
  return (record.hash.length - HEX_PREFIX_LENGTH) / 2;
}

export function createPbkdf2PinHasher(params: PinKdfParams): PinHasher {
  // Synchronous pure-JS PBKDF2; yield first so pending UI updates paint.
  const derive = async (pin: string, salt: string, iterations: number, keyBytes: number) => {
    await yieldToUi();
    return pbkdf2(toUtf8Bytes(pin), salt, iterations, keyBytes, 'sha256');
  };

  return {
    async hash(pin) {
      const salt = hexlify(randomBytes(params.saltBytes));
      const hash = await derive(pin, salt, params.iterations, params.keyBytes);
      return { v: params.version, algo: params.algo, iterations: params.iterations, salt, hash };
    },
    async verify(pin, record) {
      if (record.algo !== 'pbkdf2-sha256') {
        throw new Error(`Unsupported PIN record algorithm (v${record.v})`);
      }
      const candidate = await derive(pin, record.salt, record.iterations, keyLengthOf(record));
      return constantTimeEqual(candidate, record.hash);
    },
    needsRehash(record) {
      return (
        record.v !== params.version ||
        record.algo !== params.algo ||
        record.iterations !== params.iterations ||
        keyLengthOf(record) !== params.keyBytes
      );
    },
  };
}

export const pinHasher: PinHasher = createPbkdf2PinHasher(PIN_KDF);
