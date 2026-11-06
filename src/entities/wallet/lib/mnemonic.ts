import { Mnemonic, randomBytes } from 'ethers';

const ENTROPY_BYTES_12_WORDS = 16; // 128 bits of entropy → 12 words (D-12).
const VALID_WORD_COUNTS: readonly number[] = [12, 24];

/** New random 12-word BIP-39 phrase (English wordlist). */
export function generateMnemonic(): string {
  return Mnemonic.fromEntropy(randomBytes(ENTROPY_BYTES_12_WORDS)).phrase;
}

/** Lowercases and collapses whitespace so pasted phrases validate. */
export function normalizePhrase(input: string): string {
  return input.trim().toLowerCase().split(/\s+/).join(' ');
}

export function splitWords(phrase: string): string[] {
  return normalizePhrase(phrase).split(' ');
}

/** 12 or 24 words with a valid BIP-39 checksum. Expects a normalized phrase. */
export function isValidMnemonic(phrase: string): boolean {
  return VALID_WORD_COUNTS.includes(splitWords(phrase).length) && Mnemonic.isValidMnemonic(phrase);
}
