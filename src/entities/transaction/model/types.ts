export type TxStatus = 'pending' | 'confirmed' | 'final' | 'failed' | 'dropped' | 'replaced';

/** Fee fields of the signed tx, as decimal strings so they survive JSON. */
export type TxFeeRecord =
  | {
      readonly mode: 'eip1559';
      readonly gasLimit: string;
      readonly maxFeePerGas: string;
      readonly maxPriorityFeePerGas: string;
    }
  | { readonly mode: 'legacy'; readonly gasLimit: string; readonly gasPrice: string };

/** A transaction sent from this app (architecture §8, local records). Public data only. */
export type LocalTxRecord = {
  readonly hash: string;
  readonly from: string;
  /** The recipient (for a token transfer, the person, not the token contract). */
  readonly to: string;
  /** Amount in the asset's base units, as a decimal string. */
  readonly value: string;
  /** getAssetKey(asset): 'native' or the lowercase token address. */
  readonly assetKey: string;
  /** D-29: from getTransactionCount(addr, 'pending'); detects replaced or dropped txs. */
  readonly nonce: number;
  readonly fee: TxFeeRecord;
  /** RPC node the tx was broadcast to. */
  readonly node: string;
  readonly createdAt: number;
  readonly status: TxStatus;
  readonly confirmations: number;
  readonly blockNumber: number | null;
  /** Dropped detection (D-48): when the node first stopped knowing the tx; null while known. */
  readonly unknownSince: number | null;
};

/** What a status poll writes back onto a record. */
export type TxRecordUpdate = Pick<
  LocalTxRecord,
  'status' | 'confirmations' | 'blockNumber' | 'unknownSince'
>;
