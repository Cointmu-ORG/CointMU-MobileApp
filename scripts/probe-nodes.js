/**
 * Read-only probe of the CointMU RPC nodes (dev only; never signs or sends a transaction).
 * Usage: npm run probe:nodes [-- url1 url2 ...]   (default: EXPO_PUBLIC_RPC_URLS from .env)
 * Feeds Q-03 (EIP-1559), Q-04 (block time, uncle rate) and the history/receipt-poll config.
 */
const { randomBytes } = require('node:crypto');

const REQUEST_TIMEOUT_MS = 15_000;
const BLOCK_SAMPLE = 1000;
const BATCH_SIZE = 100;
// How far back to look for a mined tx when the sampled blocks are all empty.
const TX_SEARCH_MAX_BLOCKS = 20_000;
const LOG_RANGES = [10_000, 5_000, 2_000, 1_000];
const FULL_BLOCK_SAMPLES = 10;
const P95 = 0.95;
const HASH_BYTES = 32;
const DEFAULT_CHAIN_ID = 1912;
// keccak256("Transfer(address,address,uint256)"), the topic History filters on.
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const OPTIONAL_NAMESPACES = { txpool: ['txpool_status', []], debug: ['debug_getBadBlocks', []] };

const expectedChainId = Number(process.env.EXPO_PUBLIC_CHAIN_ID || DEFAULT_CHAIN_ID);
const toNum = (hex) => Number(BigInt(hex));
const toHex = (n) => `0x${n.toString(16)}`;
let nextId = 1;

/** POSTs one JSON-RPC payload (single call or batch array) and returns the parsed body. */
async function post(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

async function rpc(url, method, params = []) {
  const body = await post(url, { jsonrpc: '2.0', id: nextId++, method, params });
  if (body.error) throw new Error(`${method}: ${body.error.message} (${body.error.code})`);
  return body.result;
}

/** Runs calls as JSON-RPC batches of BATCH_SIZE; results come back in call order. */
async function batch(url, calls) {
  const results = [];
  for (let i = 0; i < calls.length; i += BATCH_SIZE) {
    const chunk = calls.slice(i, i + BATCH_SIZE).map(([method, params]) => ({
      jsonrpc: '2.0',
      id: nextId++,
      method,
      params,
    }));
    const byId = new Map((await post(url, chunk)).map((r) => [r.id, r]));
    for (const { id, method } of chunk) {
      const r = byId.get(id);
      if (!r || r.error) throw new Error(`${method} in batch: ${r?.error?.message ?? 'no answer'}`);
      results.push(r.result);
    }
  }
  return results;
}

async function timed(fn) {
  const start = performance.now();
  const value = await fn();
  return { value, ms: Math.round(performance.now() - start) };
}

const headers = (url, from, to) => {
  const calls = [];
  for (let n = from; n <= to; n++) calls.push(['eth_getBlockByNumber', [toHex(n), false]]);
  return batch(url, calls);
};

async function identity(url) {
  const [chainId, netVersion, peers, client, head] = await batch(url, [
    ['eth_chainId', []],
    ['net_version', []],
    ['net_peerCount', []],
    ['web3_clientVersion', []],
    ['eth_blockNumber', []],
  ]);
  return { chainId: toNum(chainId), netVersion, peers: toNum(peers), client, head: toNum(head) };
}

async function feeSupport(url) {
  const latest = await rpc(url, 'eth_getBlockByNumber', ['latest', false]);
  let feeHistory;
  try {
    await rpc(url, 'eth_feeHistory', ['0x4', 'latest', [50]]);
    feeHistory = 'works';
  } catch (err) {
    feeHistory = `error: ${err.message}`;
  }
  return { baseFeePerGas: latest.baseFeePerGas ?? null, feeHistory };
}

function blockStats(blocks) {
  const gaps = blocks.slice(1).map((b, i) => toNum(b.timestamp) - toNum(blocks[i].timestamp));
  const sorted = [...gaps].sort((a, b) => a - b);
  const avg = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  const withUncles = blocks.filter((b) => b.uncles.length > 0).length;
  return {
    sampled: blocks.length,
    avgBlockTimeS: Number(avg.toFixed(2)),
    p95BlockTimeS: sorted[Math.ceil(sorted.length * P95) - 1],
    maxBlockTimeS: sorted[sorted.length - 1],
    uncleRate: Number((withUncles / blocks.length).toFixed(4)),
    txBlocks: blocks.filter((b) => b.transactions.length > 0).length,
  };
}

/** Latest mined tx: first from the sample, else walks further back in batches. */
async function findMinedTx(url, sample, head) {
  const find = (blocks) => [...blocks].reverse().find((b) => b.transactions.length > 0);
  let hit = find(sample);
  let to = head - sample.length;
  while (!hit && head - to < TX_SEARCH_MAX_BLOCKS && to > 0) {
    const from = Math.max(0, to - BLOCK_SAMPLE + 1);
    hit = find(await headers(url, from, to));
    to = from - 1;
  }
  return hit ? { hash: hit.transactions[0], block: toNum(hit.number) } : null;
}

async function logsRange(url, head) {
  for (const range of LOG_RANGES) {
    const from = Math.max(0, head - range + 1);
    const filter = { fromBlock: toHex(from), toBlock: toHex(head), topics: [TRANSFER_TOPIC] };
    try {
      const { value, ms } = await timed(() => rpc(url, 'eth_getLogs', [filter]));
      return { range, ms, logs: value.length };
    } catch {
      // Too wide for this node; try the next smaller range.
    }
  }
  return null;
}

async function fullBlockLatency(url, head) {
  const singles = [];
  for (let n = head; n > head - FULL_BLOCK_SAMPLES; n--) {
    singles.push((await timed(() => rpc(url, 'eth_getBlockByNumber', [toHex(n), true]))).ms);
  }
  const calls = [];
  for (let n = head; n > head - BATCH_SIZE; n--)
    calls.push(['eth_getBlockByNumber', [toHex(n), true]]);
  const batchMs = (await timed(() => batch(url, calls))).ms;
  const avgMs = Math.round(singles.reduce((s, ms) => s + ms, 0) / singles.length);
  return {
    avgSingleMs: avgMs,
    maxSingleMs: Math.max(...singles),
    [`batch${BATCH_SIZE}Ms`]: batchMs,
  };
}

async function receipts(url, minedTx) {
  const randomHash = `0x${randomBytes(HASH_BYTES).toString('hex')}`;
  const unknown = await rpc(url, 'eth_getTransactionReceipt', [randomHash]);
  const known = minedTx ? await rpc(url, 'eth_getTransactionReceipt', [minedTx.hash]) : null;
  return {
    knownTx: minedTx?.hash ?? 'none found',
    knownReceipt: known
      ? `status ${toNum(known.status)} in block ${toNum(known.blockNumber)}`
      : 'null',
    unknownHashReturns: unknown === null ? 'null (ok)' : JSON.stringify(unknown),
  };
}

async function namespaces(url) {
  const result = { eth: 'on', net: 'on', web3: 'on' }; // identity() already called all three
  for (const [ns, [method, params]] of Object.entries(OPTIONAL_NAMESPACES)) {
    result[ns] = await rpc(url, method, params).then(
      () => 'on',
      (err) => `off (${err.message})`,
    );
  }
  return result;
}

async function probe(url) {
  const id = await identity(url);
  const sample = await headers(url, Math.max(0, id.head - BLOCK_SAMPLE + 1), id.head);
  const minedTx = await findMinedTx(url, sample, id.head);
  return {
    url,
    ...id,
    chainOk: id.chainId === expectedChainId,
    fees: await feeSupport(url),
    blocks: blockStats(sample),
    logs: await logsRange(url, id.head),
    fullBlock: await fullBlockLatency(url, id.head),
    receipts: await receipts(url, minedTx),
    namespaces: await namespaces(url),
  };
}

async function agreement(reports) {
  const height = Math.min(...reports.map((r) => r.head));
  const hashes = await Promise.all(
    reports.map((r) =>
      rpc(r.url, 'eth_getBlockByNumber', [toHex(height), false]).then((b) => b.hash),
    ),
  );
  return { height, agree: new Set(hashes).size === 1, hashes };
}

async function main() {
  const args = process.argv.slice(2);
  const urls =
    args.length > 0
      ? args
      : (process.env.EXPO_PUBLIC_RPC_URLS || '')
          .split(',')
          .map((u) => u.trim())
          .filter(Boolean);
  if (urls.length === 0)
    throw new Error('No nodes: set EXPO_PUBLIC_RPC_URLS or pass URLs as arguments.');
  console.log(
    `CointMU node probe, ${new Date().toISOString()}, expected chain ${expectedChainId}\n`,
  );
  const reports = [];
  for (const url of urls) {
    try {
      const report = await probe(url);
      reports.push(report);
      console.log(JSON.stringify(report, null, 2), '\n');
    } catch (err) {
      console.log(`${url}: UNREACHABLE or failed (${err.message})\n`);
    }
  }
  if (reports.length > 1)
    console.log('Agreement:', JSON.stringify(await agreement(reports), null, 2));
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
