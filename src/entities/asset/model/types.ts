export type NativeAsset = {
  readonly kind: 'native';
  readonly symbol: string;
  readonly decimals: number;
};

export type Erc20Asset = {
  readonly kind: 'erc20';
  /** Checksummed contract address. */
  readonly address: string;
  readonly symbol: string;
  readonly decimals: number;
  readonly name: string | null;
  /** Built-in tokens ship with the app; custom ones were added by the user and are unverified. */
  readonly source: 'builtin' | 'custom';
};

export type Asset = NativeAsset | Erc20Asset;
