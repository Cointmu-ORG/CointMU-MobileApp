export type Asset =
  | { readonly kind: 'native'; readonly symbol: string; readonly decimals: number }
  | {
      readonly kind: 'erc20';
      readonly address: string;
      readonly symbol: string;
      readonly decimals: number;
    };
