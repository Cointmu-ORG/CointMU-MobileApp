/**
 * Dev only, read-only: watches a mined or pending tx with the app's own status state machine
 * (src/entities/transaction/lib) and prints each transition until it settles. Never signs or sends.
 * Usage: npm run watch:tx -- <txHash> [--rpc <url>] [--replay]
 *   --rpc     node to ask (default: first of EXPO_PUBLIC_RPC_URLS, the app's default node)
 *   --replay  for a tx that is already deep: use the real receipt but step the head from the
 *             receipt block upward, to show confirmed → final without waiting for new blocks
 * Needs Node >= 22.18 (loads the .ts sources with built-in type stripping).
 */
const { isTxSettled, resolveTxStatus } = require('../src/entities/transaction/lib/tx-status.ts');
const {
  TX_POLICY,
  TX_POLL_INTERVAL_MS,
} = require('../src/entities/transaction/config/tx-config.ts');

const REQUEST_TIMEOUT_MS = 10_000;
const HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/;
const toNum = (hex) => Number(BigInt(hex));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let nextId = 1;

async function rpc(url, method, params) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const body = await res.json();
  if (body.error) throw new Error(`${method}: ${body.error.message}`);
  return body.result;
}

/** Same reads, same order as observeTx in src/entities/transaction/api (nonce before receipt). */
async function observe(url, tx, headOverride) {
  const latestNonce = toNum(await rpc(url, 'eth_getTransactionCount', [tx.from, 'latest']));
  const [receipt, known] = await Promise.all([
    rpc(url, 'eth_getTransactionReceipt', [tx.hash]),
    rpc(url, 'eth_getTransactionByHash', [tx.hash]),
  ]);
  const headBlock = headOverride ?? toNum(await rpc(url, 'eth_blockNumber', []));
  return {
    latestNonce,
    receipt: receipt && {
      status: receipt.status == null ? null : toNum(receipt.status),
      blockNumber: toNum(receipt.blockNumber),
    },
    isKnownToNode: known !== null,
    headBlock,
    now: Date.now(),
  };
}

function parseArgs(argv) {
  const hash = argv.find((a) => HASH_PATTERN.test(a));
  const rpcIndex = argv.indexOf('--rpc');
  const defaultUrl = (process.env.EXPO_PUBLIC_RPC_URLS || '').split(',')[0].trim();
  const url = rpcIndex >= 0 ? argv[rpcIndex + 1] : defaultUrl;
  if (!hash) throw new Error('Usage: watch-tx.js <0x 32-byte tx hash> [--rpc <url>] [--replay]');
  if (!url) throw new Error('No node: set EXPO_PUBLIC_RPC_URLS or pass --rpc <url>.');
  return { hash, url, isReplay: argv.includes('--replay') };
}

function report(progress, obs, label) {
  const at = new Date(obs.now).toISOString();
  console.log(
    `${at}  head ${obs.headBlock}${label}  ${progress.status}  (${progress.confirmations} conf)`,
  );
}

async function main() {
  const { hash, url, isReplay } = parseArgs(process.argv.slice(2));
  const found = await rpc(url, 'eth_getTransactionByHash', [hash]);
  if (!found) throw new Error(`Node ${url} does not know tx ${hash}.`);
  const tx = { hash, from: found.from, nonce: toNum(found.nonce), createdAt: Date.now() };
  console.log(
    `Watching ${hash} on ${url}, nonce ${tx.nonce}, final at ${TX_POLICY.finalConfirmations} conf${isReplay ? ' (replay)' : ''}`,
  );

  let head = isReplay && found.blockNumber ? toNum(found.blockNumber) : undefined;
  let last = '';
  for (;;) {
    const obs = await observe(url, tx, head);
    const progress = resolveTxStatus(tx, obs, TX_POLICY);
    const key = `${progress.status}/${progress.confirmations}`;
    if (key !== last) report(progress, obs, head === undefined ? '' : ' (replayed)');
    last = key;
    if (isTxSettled(progress, TX_POLICY)) return;
    if (head === undefined) await sleep(TX_POLL_INTERVAL_MS);
    else head += 1;
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
