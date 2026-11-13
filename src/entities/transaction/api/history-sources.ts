import { getAddress, id, zeroPadValue, type JsonRpcProvider, type Log } from 'ethers';

import { callRpc } from '@/shared/api';
import { mapWithLimit } from '@/shared/lib';

import {
  BLOCK_FETCH_CONCURRENCY,
  LOGS_CHUNK_BLOCKS,
  MIN_LOGS_CHUNK_BLOCKS,
  NATIVE_SCAN_PAGE_BLOCKS,
  TX_POLICY,
} from '../config/tx-config';
import { fetchInChunks, type BlockRange } from '../lib/history';
import { ownerViews } from '../lib/history-item';
import type { HistoryItem, TxStatus } from '../model/types';

export type HistoryReader = Pick<JsonRpcProvider, 'getBlock' | 'getTransactionReceipt' | 'getLogs'>;

export type SourceContext = {
  /** The user's own addresses to look for, lowercase. One pass covers all of them. */
  readonly owners: readonly string[];
  /** Head block when this history session started; depth is measured from it. */
  readonly head: number;
  /** Oldest block any source looks at (head − NATIVE_SCAN_WINDOW_BLOCKS + 1). */
  readonly floor: number;
};

export type SourcePage = {
  readonly items: HistoryItem[];
  /** Block to continue from (downwards), or null when this source has nothing older. */
  readonly nextCursor: number | null;
};

/**
 * One way to find a wallet's transactions (architecture §8). Sources page backwards from a
 * block cursor and are merged by hash; an indexer or explorer API can replace any of them.
 */
export type TransactionSource = {
  readonly id: string;
  loadPage: (cursor: number, context: SourceContext) => Promise<SourcePage>;
};

// keccak256("Transfer(address,address,uint256)"), same topic as entities/asset's ERC-20 ABI.
const TRANSFER_TOPIC = id('Transfer(address,address,uint256)');
const RECEIPT_CONCURRENCY = 4;
const MS_PER_SECOND = 1000;

function depthStatus(head: number, blockNumber: number, isReverted: boolean) {
  const confirmations = Math.max(1, head - blockNumber + 1);
  const isFinal = confirmations >= TX_POLICY.finalConfirmations;
  const status: TxStatus = isReverted ? 'failed' : isFinal ? 'final' : 'confirmed';
  return { status, confirmations };
}

const nextCursor = (from: number, floor: number) => (from > floor ? from - 1 : null);

/** Transactions this app sent (persisted); they never page. */
export function localSource(items: readonly HistoryItem[]): TransactionSource {
  return { id: 'local', loadPage: async () => ({ items: [...items], nextCursor: null }) };
}

/**
 * Native CMU moved to or from any of the owners, by scanning full blocks: each block is fetched
 * once and checked against every own address. Only top-level transactions with a value are
 * visible: contract-internal transfers are not (Q-33). Zero-value calls from an owner (token
 * transfers) come from the ERC-20 source instead.
 */
export function nativeScanSource(provider: HistoryReader): TransactionSource {
  return {
    id: 'native',
    loadPage: async (cursor, { owners, head, floor }) => {
      const owned = new Set(owners);
      const from = Math.max(floor, cursor - NATIVE_SCAN_PAGE_BLOCKS + 1);
      const numbers = Array.from({ length: cursor - from + 1 }, (_, i) => cursor - i);
      const blocks = await mapWithLimit(numbers, BLOCK_FETCH_CONCURRENCY, (n) =>
        callRpc(() => provider.getBlock(n, true)),
      );
      const matches = blocks.flatMap((block) =>
        (block?.prefetchedTransactions ?? [])
          .filter((tx) => tx.value > 0n)
          .map((tx) => ({
            tx,
            timestamp: block?.timestamp ?? 0,
            views: ownerViews(tx.from, tx.to ?? '', owned),
          }))
          .filter(({ views }) => views.length > 0),
      );
      const rows = await mapWithLimit(matches, RECEIPT_CONCURRENCY, async (match) => {
        const { tx, timestamp, views } = match;
        const receipt = await callRpc(() => provider.getTransactionReceipt(tx.hash));
        const blockNumber = tx.blockNumber ?? receipt?.blockNumber ?? head;
        const row = {
          hash: tx.hash,
          from: tx.from,
          to: tx.to ?? '',
          value: tx.value.toString(),
          assetKey: 'native',
          ...depthStatus(head, blockNumber, receipt?.status === 0),
          blockNumber,
          timestamp: timestamp * MS_PER_SECOND,
          source: 'chain' as const,
        };
        return views.map((view) => ({ ...row, ...view }));
      });
      return { items: rows.flat(), nextCursor: nextCursor(from, floor) };
    },
  };
}

/** A JSON-RPC error answer (the node is up but refused the range), not a network failure. */
function isNodeRejection(error: unknown): boolean {
  const cause = error instanceof Error ? error.cause : undefined;
  const code = (cause as { code?: unknown } | undefined)?.code;
  return code !== 'NETWORK_ERROR' && code !== 'TIMEOUT' && cause !== undefined;
}

async function blockTimes(provider: HistoryReader, logs: readonly Log[]) {
  const numbers = [...new Set(logs.map((log) => log.blockNumber))];
  const blocks = await mapWithLimit(numbers, BLOCK_FETCH_CONCURRENCY, (n) =>
    callRpc(() => provider.getBlock(n)),
  );
  return new Map(numbers.map((n, i) => [n, (blocks[i]?.timestamp ?? 0) * MS_PER_SECOND]));
}

/** A log found by both the "sent" and the "received" query (own to own) counts once. */
function uniqueLogs(logs: readonly Log[]): Log[] {
  return [...new Map(logs.map((log) => [`${log.transactionHash}:${log.index}`, log])).values()];
}

/**
 * ERC-20 Transfer logs of the listed tokens, sent or received by any of the owners: the owner
 * topics are OR-arrays, so one "sent" and one "received" query cover every own address. getLogs
 * ranges come from the probe (LOGS_CHUNK_BLOCKS) and shrink when a node refuses one.
 */
export function erc20LogsSource(
  provider: HistoryReader,
  tokens: readonly string[],
): TransactionSource {
  return {
    id: 'erc20',
    loadPage: async (cursor, { owners, head, floor }) => {
      if (tokens.length === 0 || owners.length === 0) return { items: [], nextCursor: null };
      const owned = new Set(owners);
      const from = Math.max(floor, cursor - LOGS_CHUNK_BLOCKS + 1);
      const ownerTopics = owners.map((owner) => zeroPadValue(owner, 32));
      const query = ({ from: fromBlock, to: toBlock }: BlockRange) => {
        const base = { address: [...tokens], fromBlock, toBlock };
        return Promise.all([
          provider.getLogs({ ...base, topics: [TRANSFER_TOPIC, ownerTopics] }),
          provider.getLogs({ ...base, topics: [TRANSFER_TOPIC, null, ownerTopics] }),
        ]).then(([sent, received]) => [...sent, ...received]);
      };
      const found = await fetchInChunks(
        { from, to: cursor },
        {
          size: LOGS_CHUNK_BLOCKS,
          minSize: MIN_LOGS_CHUNK_BLOCKS,
          fetch: (range) => callRpc(() => query(range), { retries: 0 }),
          shouldSplit: isNodeRejection,
        },
      );
      const logs = uniqueLogs(found);
      const times = await blockTimes(provider, logs);
      const items = logs.flatMap((log) => {
        const sender = getAddress(`0x${(log.topics[1] ?? '').slice(-40)}`);
        const recipient = getAddress(`0x${(log.topics[2] ?? '').slice(-40)}`);
        const row = {
          hash: log.transactionHash,
          from: sender,
          to: recipient,
          // Non-standard tokens may index the value instead; an empty data field reads as 0.
          value: BigInt(log.data === '0x' ? 0 : log.data).toString(),
          assetKey: log.address.toLowerCase(),
          // A Transfer log only exists for a successful tx.
          ...depthStatus(head, log.blockNumber, false),
          blockNumber: log.blockNumber,
          timestamp: times.get(log.blockNumber) ?? 0,
          source: 'chain' as const,
        };
        return ownerViews(sender, recipient, owned).map((view) => ({ ...row, ...view }));
      });
      return { items, nextCursor: nextCursor(from, floor) };
    },
  };
}
