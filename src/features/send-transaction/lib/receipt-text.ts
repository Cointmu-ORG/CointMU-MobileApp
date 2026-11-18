/** What the shared receipt says: the same values the receipt shows, already formatted. */
export type ReceiptFacts = {
  /** Amount with its symbol, e.g. "1.5 CMU". */
  readonly amount: string;
  /** The recipient as shown: an own account's name with its short address, or the short address. */
  readonly to: string;
  readonly date: string;
  /** The status in plain words, e.g. "Confirmed". */
  readonly status: string;
  readonly hash: string;
};

type Translate = (key: string, values: { value: string }) => string;

/**
 * The plain-text receipt handed to the system share sheet: a title and one line per fact.
 * Public data only (no key, no balance), and nothing the receipt itself does not show.
 */
export function buildReceiptText(facts: ReceiptFacts, title: string, translate: Translate): string {
  const line = (field: keyof ReceiptFacts) =>
    translate(`send.receipt.shareLine.${field}`, { value: facts[field] });
  return [title, line('amount'), line('to'), line('date'), line('status'), line('hash')].join('\n');
}
