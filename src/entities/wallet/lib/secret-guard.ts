import { LangEn } from 'ethers';

import { splitWords } from './mnemonic';

// A raw private key (or any 32-byte secret), with or without 0x.
const HEX_SECRET = /^(0x)?[0-9a-fA-F]{64}$/;
const PHRASE_LENGTHS: readonly number[] = [12, 24];

// getWordIndex returns -1 for a word that is not in the list.
const isBip39Word = (word: string) => LangEn.wordlist().getWordIndex(word) >= 0;

/**
 * True when text looks like a wallet secret: a 64-hex string, or 12 or 24 words that are all
 * BIP-39 words (checksum not required, so a phrase with a typo is caught too). Used to refuse
 * scanned or pasted secrets; the caller must not log or keep the text.
 */
export function looksLikeSecret(text: string): boolean {
  const value = text.trim();
  if (HEX_SECRET.test(value)) return true;
  const words = splitWords(value);
  return PHRASE_LENGTHS.includes(words.length) && words.every(isBip39Word);
}
