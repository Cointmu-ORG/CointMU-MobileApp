export type TxStatus = 'pending' | 'confirmed' | 'final' | 'failed' | 'dropped' | 'replaced';

/** A transaction sent from this app (architecture §8, local records). */
export type LocalTxRecord = {
  readonly hash: string;
  readonly from: string;
  readonly to: string;
  /** bigint in base units, stored as a decimal string so it survives JSON. */
  readonly value: string;
  readonly assetKey: string;
  /** D-29: needed to detect replaced or dropped transactions. From getTransactionCount(addr, 'pending'). */
  readonly nonce: number;
  readonly status: TxStatus;
  readonly createdAt: number;
};
