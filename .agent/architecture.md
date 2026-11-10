# Architecture

## 1. Product

Non-custodial mobile wallet for the CointMU EVM chain, for everyday (non-technical) users.
Mobile is a **thin client**: no node, no mining. It only talks to a JSON-RPC endpoint.
Keys live on the device only. There is no "forgot password" and no server-side recovery.

**MVP scope:** create wallet, import wallet (mnemonic or private key), view balance, send, receive (QR), scan QR, transaction history, token support (native CMU first, ERC-20 in the same design).
**Out of scope:** swap, dApp browser, mining, fiat conversion (show `N/A` if a price field ever appears).
**Platforms:** Android and iOS from day one.

## 2. Chain

| Field | Value |
|---|---|
| Name | CointMU |
| Chain ID | 1912 |
| Symbol | CMU |
| Decimals | 18 (wei is protocol-level in geth; Q-01 closed, D-49) |
| Consensus | Proof of Work (geth-based) |
| RPC | preset node list from `EXPO_PUBLIC_RPC_URLS` (comma-separated, first is the default) plus one user-added node; see below and D-43 |

Chain config lives in one place (`src/entities/network`). Never hardcode chain ID or RPC elsewhere.

Node selection (D-43): Settings > Network lists the preset nodes and at most one node the user added. Before a node is used (selected or added) the app calls `eth_chainId` and refuses anything that is not 1912, so balances and signatures can never go to another chain. Each node shows its status and latency. The choice (`muvo.network`: selected URL and custom URL) is persisted; it is not a secret. A stored choice that no longer exists falls back to the first preset. `getProvider()` follows the selection.

## 3. Stack

| Concern | Choice |
|---|---|
| Framework | Expo (managed) + React Native + TypeScript (strict) |
| Navigation | Expo Router |
| Blockchain | ethers v6 (`JsonRpcProvider`, HTTP polling, no WebSocket) |
| State | Zustand (persist only non-sensitive data) |
| Styling | NativeWind v4 (Tailwind) |
| i18n | i18next + react-i18next, JSON per language |
| Secrets | `expo-secure-store` |
| Auth | PIN + `expo-local-authentication` |
| QR | `react-native-qrcode-svg` (show), `expo-camera` (scan) |
| Icons | `lucide-react-native` |
| Dates | date-fns |
| Errors | `@sentry/react-native` (with scrubbing) |
| Polyfill | `react-native-get-random-values`, imported first in the entry file |
| Tests | Jest (`jest-expo`) + React Native Testing Library |
| Lint | ESLint + Prettier + Steiger (FSD boundaries) |

Desktop deps that do NOT carry over: electron-*, ws, react-dom, react-router-dom, qrcode.react, lucide-react, boring-avatars (web-only; replace if avatars are wanted).
Let Expo pin `react` / `react-native` versions. Install with `npx expo install`, not plain `npm install`.

## 4. Folder structure (FSD adapted for Expo Router)

Expo Router requires a root `app/` folder for routes. FSD also has an `app` layer. To avoid the clash:
`app/` (root) = route files only, thin re-exports. FSD layers live in `src/`.
The router root is pinned in app.json: `["expo-router", { "root": "./app" }]` (D-26), so Expo Router never treats `src/app` as routes.

```
app/                         # Expo Router routes ONLY. No logic.
  _layout.tsx                # re-exports src/app root layout (auth guard)
  (onboarding)/...           # welcome, create, import, backup, verify, set-pin, recover (D-39)
  (tabs)/                    # home (index, owns `/`), history, settings
  send/                      # index (form), review, result: screens of the root stack (D-60)
  receive.tsx
  scan.tsx                   # ?from=send returns to the form; otherwise opens Send
  tokens.tsx                 # add, hide and remove ERC-20 tokens
  account-switcher.tsx       # form sheet opened from the home account chip (D-62)
  tx/[hash].tsx              # tx detail (local or scanned)
  lock.tsx
src/
  app/        routes/ (navigator layouts + auth guard), model/ (bootstrap, auto-lock), styles/
  pages/      full-screen compositions, one slice per screen
  widgets/    composite blocks (balance-card, tx-list, asset-list, history-list)
  features/   user actions (see below)
  entities/   business objects (wallet, account, asset, network, transaction)
  shared/
    api/      rpc provider factory
    config/   env, constants
    lib/      pure helpers (amount, address, logger, crypto-safe utils)
    ui/       design-system components (Button, Input, Screen, ...)
    i18n/     locales/en.json, locales/id.json, setup
```

Auth guard (D-36): the root and onboarding layouts wrap screens in `Stack.Protected`, driven by wallet status and session state. Every group's `redirectTo` comes from one function, `resolveEntryRoute({ status, isUnlocked, isRecoveryRequired })`: `none` → welcome (or recover when recovery is required, D-39), `pendingBackup` → backup, `pendingPin` → set-pin, `active` → lock or home. Protected screens never render, and a status change redirects automatically, so features change state instead of navigating.
The FSD `app` layer has no `ui` segment (Steiger `fsd/no-ui-in-app`); navigator layouts live in `src/app/routes`.

Headers (D-60): every sub-screen of the root stack uses `SUB_SCREEN_HEADER` (`src/app/routes/header-options.ts`): a translated centered title and an icon-only back button, so a route group name never shows. Screens without back are deliberate: the tabs, lock, the send result (Done only) and the auto-advancing onboarding steps.

Route file example:
```ts
// app/(tabs)/index.tsx
export { HomePage as default } from '@/pages/home';
```

### Features
`create-wallet`, `import-wallet`, `backup-mnemonic`, `verify-mnemonic`, `setup-pin`, `unlock-app`, `send-transaction`, `receive-qr`, `scan-qr`, `manage-tokens`, `change-language`, `change-pin`, `lock-settings`, `reveal-mnemonic`, `reset-wallet`, `select-network`, `manage-accounts`.

A page slice may hold the screens of one flow: `pages/send` (form, review, result) and `pages/history` (list, tx detail). This keeps the pages layer under Steiger's 20-slice limit without slice groups, which the deep-import ESLint rule would refuse.

### Slice segments
`ui/`, `model/` (Zustand store, selectors, types), `api/` (RPC calls), `lib/` (pure helpers), `config/`. Each slice exposes only `index.ts`.

### Import rules (enforced by Steiger and ESLint)
1. A layer imports only from layers **below** it: app > pages > widgets > features > entities > shared.
2. No imports between slices in the same layer.
3. Import a slice only through its `index.ts`. No deep imports.
4. `shared` knows nothing about business logic.

## 5. Wallet and key handling

- Derivation: BIP-39 mnemonic (12 words), BIP-44 path `m/44'/60'/0'/0/{index}`. A wallet starts with index 0; the user can add more accounts (index 1, 2, …) from the same mnemonic, switch between them and name them (D-44). The wallet store keeps `accounts` (index, address, name) and the active `accountIndex`/`address`; names are local and public. Private-key wallets have exactly one account. Multiple separate wallets (several secrets) are out of scope (Q-34).
- Derivation wrapper: all mnemonic → account derivation goes through `deriveAccount()` in `entities/wallet/lib/derive.ts`. ethers v6 `fromPhrase` runs PBKDF2 in pure JS and blocks the Hermes JS thread, so the wrapper waits for a painted frame first and the UI shows a Reanimated (UI-thread) progress animation. Swapping the PBKDF2 backend later only touches this function (Q-30).
- Import: mnemonic (12 or 24 words) or raw private key. A private-key import has no mnemonic and cannot derive more accounts. The import screen shows a mandatory "back up this key yourself" warning that the user must acknowledge (D-28).
- Storage: mnemonic or private key goes in `expo-secure-store` with `keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY`. It is never put in Zustand, AsyncStorage, logs, Sentry, or navigation params. The clipboard is used only for the user's own address; there is no copy action for the mnemonic or a private key.
- Onboarding state (D-32): a new mnemonic goes to SecureStore immediately, and the wallet status (persisted, non-secret) moves `none` → `pendingBackup` → `pendingPin` → `active`; imports go `none` → `pendingPin` → `active`. A killed app resumes at the step for its status.
- Fresh install (D-33): the iOS Keychain survives uninstall but AsyncStorage does not. If the `muvo.installed` marker is missing at startup, all of the app's SecureStore items are wiped before anything reads them.
- Startup integrity check (D-39): after the fresh-install check and store hydration, the persisted status must match what SecureStore can still read. `pendingBackup` and `pendingPin` need a readable secret; `active` needs a readable secret and a readable PIN record; `none` needs nothing. On a mismatch the app does not open the lock screen: it wipes local wallet data through the reset-wallet flow and routes to `/recover`, which explains the data couldn't be read and offers import by mnemonic or private key (reusing import-wallet) or starting a new wallet. The recovery state is persisted, so a killed app returns to `/recover`. The check reads the secret only to validate its shape; the value never leaves the wallet entity (`hasReadableWalletSecret`).
- Signing: read the secret from SecureStore **after successful auth**, build the `Wallet`, sign, and drop the reference immediately. Do not keep a long-lived `Wallet` object in global state.
- Backup flow (create wallet): show the 12 words once, block screenshots (`expo-screen-capture`), then force a verification quiz (re-enter 3 random words) before the wallet is activated.
- PIN screens (D-59): every PIN entry (lock, set-pin, change PIN, `PinPrompt` before send, reveal and remove wallet) renders `PinEntry` from `shared/ui`: header at the top, keypad anchored to the bottom, keys scaled to the screen.
- Auth: user sets a 6-digit PIN at onboarding. PIN is stored as a salted hash, never plain. Biometrics are optional on top of the PIN, and PIN is always the fallback.
- PIN hashing goes through one `PinHasher` interface in `entities/auth` with the algorithm and parameters in `entities/auth/config`. SecureStore holds a versioned record `{ v, algo, iterations, salt, hash }`; verification uses the record's own params, and an outdated record is rehashed after a successful unlock (D-34). The KDF is a placeholder until Q-32 is decided.
- Auth is required: on app open, after returning from background past the auto-lock timeout, and **before every transaction signature** and before revealing the mnemonic.
- Auto-lock: 1 minute default, user-adjustable (immediately, 1, 5, 15 min).
- PIN brute force: escalating lockout after failed attempts. After 10 failures, offer wallet reset (this wipes local keys; recovery requires the mnemonic). The failed count, lockout-until and lastSeenAt live in SecureStore, not in a persisted store (D-27). If the clock goes backwards during a lockout, the lockout restarts from now. Biometrics are not offered while a lockout runs.
- Reset wallet: confirm twice, wipe SecureStore and persisted stores, return to onboarding. From the lock screen (after 10 failures) it is two confirmations. From Settings it is "Remove wallet from this device" (D-45): a strong warning with a "I have my recovery phrase" acknowledgement, the PIN, then a final confirmation. "Lock now" only locks the session.
- Settings (D-46): Security holds change PIN (current PIN, then the new one twice), the biometrics switch (turning it on needs one successful biometric check), the auto-lock timeout (persisted in `muvo.auth.prefs`), and the recovery phrase. The phrase is read only after a PIN or biometric check, screenshots are blocked on that screen, and the words are dropped on Hide, on leaving the screen and when the app leaves the foreground. Private-key wallets show no phrase and no key (Q-35). Every PIN check, including these, shares the lockout.

## 6. Transaction flow

1. Form: recipient (`checkAddress`: lowercase or a valid EIP-55 checksum; a bad mixed-case checksum is refused) and a locale-aware amount (`parseAmountInput`: bigint base units, never floats, D-51). Paste, scan (prefill only) and "Max" (CMU: balance minus the quoted fee; token: the whole balance).
2. Quote: `estimateGas` (a revert fails early with a friendly message) and `getFeeData()`. Fee mode at runtime: `maxFeePerGas` → EIP-1559 (type 2), else legacy `gasPrice` (type 0) (D-22; the nodes support EIP-1559, D-47). Warnings (never blocking): sending to yourself, recipient is a contract (`getCode` ≠ `0x`).
3. Review: from (account name + address), to (full), amount, fee (max), total, node. The fee is refetched when the screen opens and again before signing if older than 30 s. The balance check includes the fee; a token send needs CMU for gas separately.
4. Authenticate (PIN or biometric) right before signing, every time.
5. `eth_chainId` must be 1912 on the selected node. Nonce from `getTransactionCount(addr, 'pending')`. Read the secret, sign with `chainId` set via `signWithSecret` (derivation wrapper; the signer is dropped before it returns), broadcast once (no retry). Persist the local `pending` record (hash, nonce, from, to, asset, amount, fee fields, node, createdAt) before navigating. A broadcast that times out is saved as uncertain so the poller settles it (D-53).
6. Poll (app-level, foreground only, backoff on errors): `pending` → `confirmed` (1 conf, shown as n/12) → `final` (`FINAL_CONFIRMATIONS`). Only `eth_getTransactionCount('latest')` (read first), `eth_getTransactionReceipt`, `eth_getTransactionByHash` and `eth_blockNumber` are used; txpool and debug are off on the nodes (D-48).
7. Replaced: no receipt for our hash but the nonce is used. Dropped: the node no longer returns the tx, the nonce is unused, and both held for 3 minutes since it first went unknown; a tx still in the pool stays pending however long. Reverted (receipt status 0): failed. Each state has a badge and an explanation.

Speed up and cancel of a pending tx are out of scope (Q-36).

## 7. Assets (multi-coin ready)

```ts
type Asset =
  | { kind: 'native'; symbol: string; decimals: number }
  | { kind: 'erc20'; address: string; symbol: string; decimals: number; name: string | null; source: 'builtin' | 'custom' };
```
Native CMU is the default asset. ERC-20 uses a minimal ABI (`balanceOf`, `transfer`, `decimals`, `symbol`, `name`, `Transfer` event). The registry in `entities/asset` is native CMU + `BUILTIN_TOKENS` (config, empty until official tokens exist) + custom tokens the user adds, persisted per chain (`muvo.tokens`, not secret). Adding a token checks `getCode`, reads `symbol`/`decimals`/`name` (ABI string or bytes32) and shows an "unverified token" warning first. Tokens can be hidden (built-in) or removed (custom). Balances use `balanceOf`, four at a time, polled with the native balance and cleared on account or node change (D-55).

## 8. History

No indexer is assumed (Q-11). Three `TransactionSource`s (`entities/transaction/api/history-sources.ts`), merged and deduped by hash (D-54):
- Local records for transactions sent from this app (instant, live status from the poller).
- Native transfers: bounded block scan, `NATIVE_SCAN_PAGE_BLOCKS` (1,000) full blocks per page within `NATIVE_SCAN_WINDOW_BLOCKS` (50,000, about 7 days), fetched 50 at a time so ethers batches them. Only top-level txs with a value, to or from the owner.
- ERC-20: `getLogs` on the `Transfer` topic for the listed tokens, owner as sender or recipient, in `LOGS_CHUNK_BLOCKS` (10,000) ranges that halve (down to 500) when a node refuses one.
- Cursors are cached in memory per account and chain; pages load lazily (scroll or "load older"); pull to refresh starts from the new head. Values come from the node probe (D-47).
- Known limitation: a block scan only sees top-level transactions. Native value moved by contract calls (internal transfers) is invisible without tracing or an indexer (Q-33); the History help text says so.

## 9. UI and i18n

- White and blue theme, matching the desktop app. Light mode only for MVP. Design tokens in Tailwind config.
- Languages: `id`, `en`. Files: `src/shared/i18n/locales/id.json` and `en.json`. Default = device language, fallback `en`; a language picked in Settings is stored (`muvo.language`, AsyncStorage) and restored during bootstrap, before the splash hides. No hardcoded user-facing strings.
- Amounts: show coin units only (e.g. `12.5 CMU`). Locale-aware number formatting; amount input accepts the locale's decimal separator (D-51). Dates via date-fns with the `id`/`en` locale. No fiat.
- Status and warnings never rely on color alone: badges and notices carry an icon and text.

## 10. Config

Only non-secret values via `EXPO_PUBLIC_*`: `EXPO_PUBLIC_RPC_URLS` (comma-separated preset nodes), `EXPO_PUBLIC_CHAIN_ID`, and the optional `EXPO_PUBLIC_EXPLORER_URL` (tx links appear only when it is set, Q-27). Anything in the app bundle is public. Never put API keys or credentials in the app.
