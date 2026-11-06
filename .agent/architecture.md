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
| Decimals | 18 (assumed, VERIFY against the chain) |
| Consensus | Proof of Work (geth-based) |
| RPC | from `EXPO_PUBLIC_RPC_URL` (see decisions.md, open questions) |

Chain config lives in one place (`src/entities/network`). Never hardcode chain ID or RPC elsewhere.

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

```
app/                         # Expo Router routes ONLY. No logic.
  _layout.tsx                # re-exports src/app root layout
  (onboarding)/...           # welcome, create, import, backup, verify, set-pin
  (tabs)/                    # home, history, settings
  send/ ...                  # send, confirm, result
  receive.tsx
  scan.tsx
  lock.tsx
src/
  app/        providers, bootstrap, global styles, auth guard, i18n init
  pages/      full-screen compositions, one slice per screen
  widgets/    composite blocks (balance-card, tx-list, asset-list)
  features/   user actions (see below)
  entities/   business objects (wallet, account, asset, network, transaction)
  shared/
    api/      rpc provider factory
    config/   env, constants
    lib/      pure helpers (amount, address, logger, crypto-safe utils)
    ui/       design-system components (Button, Input, Screen, ...)
    i18n/     locales/en.json, locales/id.json, setup
```

Route file example:
```ts
// app/(tabs)/index.tsx
export { HomePage as default } from '@/pages/home';
```

### Features
`create-wallet`, `import-wallet`, `backup-mnemonic`, `verify-mnemonic`, `setup-pin`, `unlock-app`, `send-transaction`, `receive-qr`, `scan-qr`, `change-language`, `lock-settings`, `reset-wallet`.

### Slice segments
`ui/`, `model/` (Zustand store, selectors, types), `api/` (RPC calls), `lib/` (pure helpers), `config/`. Each slice exposes only `index.ts`.

### Import rules (enforced by Steiger and ESLint)
1. A layer imports only from layers **below** it: app > pages > widgets > features > entities > shared.
2. No imports between slices in the same layer.
3. Import a slice only through its `index.ts`. No deep imports.
4. `shared` knows nothing about business logic.

## 5. Wallet and key handling

- Derivation: BIP-39 mnemonic (12 words), BIP-44 path `m/44'/60'/0'/0/{index}`. MVP uses index 0 only, but the data model stores `accountIndex` so multi-account can be added later.
- Import: mnemonic (12 or 24 words) or raw private key. A private-key import has no mnemonic and cannot derive more accounts.
- Storage: mnemonic or private key goes in `expo-secure-store` with `keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY`. It is never put in Zustand, AsyncStorage, logs, Sentry, or navigation params.
- Signing: read the secret from SecureStore **after successful auth**, build the `Wallet`, sign, and drop the reference immediately. Do not keep a long-lived `Wallet` object in global state.
- Backup flow (create wallet): show the 12 words once, block screenshots (`expo-screen-capture`), then force a verification quiz (re-enter 3 random words) before the wallet is activated.
- Auth: user sets a 6-digit PIN at onboarding. PIN is stored as a salted hash, never plain. Biometrics are optional on top of the PIN, and PIN is always the fallback.
- Auth is required: on app open, after returning from background past the auto-lock timeout, and **before every transaction signature** and before revealing the mnemonic.
- Auto-lock: 1 minute default, user-adjustable (immediately, 1, 5, 15 min).
- PIN brute force: escalating lockout after failed attempts. After 10 failures, offer wallet reset (this wipes local keys; recovery requires the mnemonic).
- Reset wallet: confirm twice, wipe SecureStore and persisted stores, return to onboarding.

## 6. Transaction flow

1. User enters address (validate with `isAddress`, checksum) and amount (parse with `parseUnits`, never floats).
2. Estimate gas (`estimateGas`) and fee. Detect fee mode at runtime: if `getFeeData()` returns `maxFeePerGas`, use EIP-1559; otherwise use legacy `gasPrice` (`type: 0`).
3. Review screen: recipient, amount, fee, total. Balance check includes fee.
4. Authenticate (PIN or biometric).
5. Sign and broadcast. Persist a local `pending` record with the hash right away.
6. Poll the receipt. Status: `pending` (0 conf) -> `confirmed` (1 conf) -> `final` (N conf, `FINAL_CONFIRMATIONS` in config).
7. Handle replaced, dropped, and reverted (status 0) transactions explicitly in the UI.

PoW chains can reorg, so never show a transaction as final at 1 confirmation.

## 7. Assets (multi-coin ready)

```ts
type Asset =
  | { kind: 'native'; symbol: string; decimals: number }
  | { kind: 'erc20'; address: string; symbol: string; decimals: number };
```
Native CMU is the default asset. ERC-20 uses a minimal ABI (`balanceOf`, `transfer`, `decimals`, `symbol`, `Transfer` event). Asset list is a registry in `entities/asset`.

## 8. History

No indexer is assumed. Plan (see decisions.md D-11):
- Local records for transactions sent from this app (reliable, instant).
- ERC-20: `getLogs` filtered by `Transfer` topic for the user's address.
- Native incoming transfers: bounded block scan over recent blocks, cached, lazy-loaded with pagination.
- Isolated behind one interface (`TransactionSource`) so an indexer or explorer API can replace it later without touching UI.

## 9. UI and i18n

- White and blue theme, matching the desktop app. Light mode only for MVP. Design tokens in Tailwind config.
- Languages: `id`, `en`. Files: `src/shared/i18n/locales/id.json` and `en.json`. Default = device language, fallback `en`. No hardcoded user-facing strings.
- Amounts: show coin units only (e.g. `12.5 CMU`). Locale-aware number formatting. No fiat.

## 10. Config

Only non-secret values via `EXPO_PUBLIC_*` (RPC URL, chain ID, explorer URL). Anything in the app bundle is public. Never put API keys or credentials in the app.
