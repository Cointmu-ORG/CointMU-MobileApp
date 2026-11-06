/** One address derived from the wallet (MVP: index 0 only, D-10). */
export type Account = {
  readonly address: string;
  readonly index: number;
};
