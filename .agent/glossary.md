# Glossary

| Term | Meaning |
|---|---|
| CointMU / CMU | The project's EVM chain (chain ID 1912) and its native coin symbol. |
| Thin client | App with no node. It only calls a remote JSON-RPC endpoint. |
| Non-custodial | The user holds the keys. Nobody, including us, can recover or move funds. |
| Mnemonic / seed phrase | 12 (or 24) BIP-39 words that deterministically generate the wallet keys. |
| Derivation path | BIP-44 path used to derive accounts: `m/44'/60'/0'/0/{index}`. |
| Wallet | One secret (a recovery phrase or a private key) with its accounts, a local name and a color. The app holds up to 10; one is active. |
| Account | One address of a wallet: derived from its mnemonic at a BIP-44 index (0, 1, 2, …), with an optional local name, a card color and a card icon. A private-key wallet has one account. |
| Private key | Raw 32-byte key for one address. Imported keys have no mnemonic. |
| RPC | JSON-RPC endpoint of a CointMU node (HTTP). |
| Wei | Smallest unit. 1 CMU = 10^decimals wei. Amounts are `bigint` in wei. |
| Native asset | The chain's base coin (CMU), used for value transfer and gas. |
| ERC-20 | Standard token contract. Transfers go through `transfer(to, amount)`. |
| Asset | Native coin or ERC-20 the wallet can show and send. |
| Gas / fee | Cost to include a tx. Legacy: `gasPrice`. EIP-1559: `maxFeePerGas` + priority fee. |
| Legacy tx | Type 0 transaction using `gasPrice`. Fallback if EIP-1559 is unsupported. |
| Nonce | Per-address tx counter. Prevents replay and orders transactions. |
| Confirmation | Number of blocks mined on top of the block containing the tx. |
| Final | Tx with at least `FINAL_CONFIRMATIONS`. Only then shown as final. |
| Reorg | Chain reorganisation on PoW that can drop a recently confirmed tx. |
| FSD | Feature-Sliced Design: layers app, pages, widgets, features, entities, shared. |
| Layer / slice / segment | FSD levels: layer (folder group) > slice (business unit) > segment (`ui`, `model`, `api`, `lib`, `config`). |
| Public API | A slice's `index.ts`. The only allowed import entry point. |
| Auto-lock | App re-locks after a period in background and requires auth. |
| Reset wallet | Wipes every wallet's key and all local data. Recovery needs each wallet's mnemonic or private key. |
| Remove wallet | Removes one wallet's key and accounts from the device; the other wallets and the PIN stay. Removing the last one is a reset. |
