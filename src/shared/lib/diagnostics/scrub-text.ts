import { LangEn } from 'ethers';

/** What a scrubbed value is replaced with. The address form is the one GlitchTip readers see. */
export const REDACTED = {
  phrase: '[redacted:phrase]',
  hex: '[redacted:hex]',
  address: '0x…redacted',
  digits: '[redacted:digits]',
  value: '[redacted]',
  path: '/…',
} as const;

const BIP39_WORD_COUNT = 2048;
/** Fewer than a 12-word phrase, so a phrase cut in two by a typo or a line break is still caught. */
const MIN_PHRASE_WORDS = 8;
const MAX_PHRASE_TYPOS = 2;

/** A word not preceded by a backslash, so the `n` of an escaped `\n` never starts one. */
const WORD_PATTERN = /(?<!\\)[a-z]+/gi;
/** What may sit between two phrase words: whitespace, quotes, commas, brackets, JSON escapes. */
const PHRASE_GAP_PATTERN = /^(?:[\s,;|"'`[\]]|\\[nrt"'\\])+$/;
/** 64+ hex characters: private keys, seeds, PIN hashes, tx and block hashes, signed transactions. */
const LONG_HEX_PATTERN = /(?<![0-9a-f])(?:0x)?[0-9a-f]{64,}(?![0-9a-f])/gi;
const ADDRESS_PATTERN = /(?<![0-9a-f])(?:0x)?[0-9a-f]{40}(?![0-9a-f])/gi;
/** A PIN next to its name: `pin: 135790`, `PIN=135790`, `passcode "135790"`. */
const NAMED_PIN_PATTERN = /\b(pin|passcode|password)\b(\W{0,3})\d{4,8}(?!\d)/gi;
/** Any standalone run of exactly six digits could be the PIN; a block height is the price. */
const SIX_DIGITS_PATTERN = /(?<!\d)\d{6}(?!\d)/g;
const URL_PATTERN = /\b(https?|wss?):\/\/([^\s"'`<>()[\]{}]+)/gi;
const URL_TAIL_START = /[/?#]/;

let bip39Words: ReadonlySet<string> | null = null;

/** Built on first use: decoding the word list costs a few milliseconds. */
function getBip39Words(): ReadonlySet<string> {
  if (bip39Words === null) {
    const wordlist = LangEn.wordlist();
    bip39Words = new Set(
      Array.from({ length: BIP39_WORD_COUNT }, (_, index) => wordlist.getWord(index)),
    );
  }
  return bip39Words;
}

type WordToken = { readonly start: number; readonly end: number; readonly isBip39: boolean };

type PhraseRun = {
  readonly start: number;
  /** Start of a misspelled word right before the first BIP-39 word, if any. */
  readonly leadStart: number | null;
  end: number;
  words: number;
  typos: number;
};

function isPhraseGap(text: string, from: number, to: number): boolean {
  return PHRASE_GAP_PATTERN.test(text.slice(from, to));
}

function startRun(text: string, word: WordToken, previous: WordToken | null): PhraseRun {
  const hasLead =
    previous !== null && !previous.isBip39 && isPhraseGap(text, previous.end, word.start);
  return {
    start: word.start,
    leadStart: hasLead ? previous.start : null,
    end: word.end,
    words: 1,
    typos: 0,
  };
}

function toSpan(run: PhraseRun): [number, number] | null {
  if (run.words < MIN_PHRASE_WORDS) return null;
  const hasRoomForLead = run.leadStart !== null && run.typos < MAX_PHRASE_TYPOS;
  return [hasRoomForLead && run.leadStart !== null ? run.leadStart : run.start, run.end];
}

/**
 * Finds runs that look like a recovery phrase: at least 8 BIP-39 words joined by phrase
 * separators (spaces, newlines, commas, quotes, a JSON array), with up to 2 other words
 * (typos) inside or right before them. Same rule as the desktop app's sanitizer.
 */
function findPhraseSpans(text: string): [number, number][] {
  const words = getBip39Words();
  const spans: [number, number][] = [];
  let run: PhraseRun | null = null;
  let previous: WordToken | null = null;
  const closeRun = (): void => {
    const span = run === null ? null : toSpan(run);
    if (span !== null) spans.push(span);
    run = null;
  };
  for (const match of text.matchAll(WORD_PATTERN)) {
    const start = match.index;
    const token: WordToken = {
      start,
      end: start + match[0].length,
      isBip39: words.has(match[0].toLowerCase()),
    };
    if (run !== null && !isPhraseGap(text, run.end, token.start)) closeRun();
    if (run !== null && !token.isBip39 && run.typos === MAX_PHRASE_TYPOS) closeRun();
    if (run !== null) {
      run.end = token.end;
      if (token.isBip39) run.words += 1;
      else run.typos += 1;
    } else if (token.isBip39) {
      run = startRun(text, token, previous);
    }
    previous = token;
  }
  closeRun();
  return spans;
}

function redactPhrases(text: string): string {
  return findPhraseSpans(text)
    .reverse()
    .reduce((acc, [start, end]) => acc.slice(0, start) + REDACTED.phrase + acc.slice(end), text);
}

function splitUrl(rest: string): { host: string; tail: string } {
  const tailStart = rest.search(URL_TAIL_START);
  const authority = tailStart === -1 ? rest : rest.slice(0, tailStart);
  return {
    // Everything up to the last `@` is the user name and password.
    host: authority.slice(authority.lastIndexOf('@') + 1),
    tail: tailStart === -1 ? '' : rest.slice(tailStart),
  };
}

/** An RPC URL keeps its scheme and host only: credentials, API-key paths and queries go. */
function redactUrls(text: string): string {
  return text.replace(URL_PATTERN, (_match, scheme: string, rest: string) => {
    const { host, tail } = splitUrl(rest);
    return `${scheme}://${host}${tail === '' || tail === '/' ? tail : REDACTED.path}`;
  });
}

/** A source file URL keeps its path (the bundle name) but loses credentials and its query. */
function trimSourceUrls(text: string): string {
  return text.replace(URL_PATTERN, (_match, scheme: string, rest: string) => {
    const { host, tail } = splitUrl(rest);
    return `${scheme}://${host}${tail.split(/[?#]/)[0]}`;
  });
}

function redactSecrets(text: string): string {
  return redactPhrases(text)
    .replace(LONG_HEX_PATTERN, REDACTED.hex)
    .replace(ADDRESS_PATTERN, REDACTED.address)
    .replace(NAMED_PIN_PATTERN, `$1$2${REDACTED.value}`)
    .replace(SIX_DIGITS_PATTERN, REDACTED.digits);
}

/**
 * Removes wallet secrets and identifying data from free text before it leaves the phone:
 * recovery phrases (typos tolerated), private keys and every other 64-hex string (tx hashes
 * included), wallet addresses, PIN-looking digits, and everything in a URL but its host.
 */
export function scrubText(text: string): string {
  return redactSecrets(redactUrls(text));
}

/** scrubText for a stack frame's file name, which may be a dev-server URL with a query. */
export function scrubFilename(filename: string): string {
  return redactSecrets(trimSourceUrls(filename));
}
