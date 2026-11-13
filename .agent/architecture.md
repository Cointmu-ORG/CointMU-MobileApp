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
| RPC | preset node list from `EXPO_PUBLIC_RPC_URLS` (comma-separated, first is the default) plus user-added nodes; see below, D-43 and D-67 |

Chain config lives in one place (`src/entities/network`). Never hardcode chain ID or RPC elsewhere.

Node selection (D-43, D-67): Settings > Network lists the preset nodes and the nodes the user added (10 in all). Before a node is used (selected or added) the app calls `eth_chainId` and refuses anything that is not 1912, so balances and signatures can never go to another chain. Each node shows its status and latency, the chain check, its block height and an "out of sync" flag when it lags the best node by more than `NODE_SYNC_LAG_BLOCKS`. Pings run on open, on "Ping all" or pull-to-refresh, three at a time with a timeout, and stop when the screen closes or the app leaves the foreground. The choice (`muvo.network`, version 1: selected URL and custom URLs) is persisted; it is not a secret. A stored choice that no longer exists falls back to the first preset. `getProvider()` follows the selection.

## 3. Stack

| Concern | Choice |
|---|---|
| Framework | Expo (managed) + React Native + TypeScript (strict) |
| Navigation | Expo Router |
| Blockchain | ethers v6 (`JsonRpcProvider`, HTTP polling, no WebSocket) |
| State | Zustand (persist only non-sensitive data) |
| Styling | NativeWind v4 (Tailwind); colors are CSS variables set on the root view (D-66) |
| i18n | i18next + react-i18next, JSON per language |
| Secrets | `expo-secure-store` |
| Auth | PIN + `expo-local-authentication` |
| QR | `react-native-qrcode-svg` (show), `expo-camera` (scan) |
| Icons | `lucide-react-native` |
| Dates | date-fns |
| Errors | `@sentry/react-native` to GlitchTip, opt-out, scrubbed, queued offline (D-77) |
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
  (tabs)/                    # home (index, owns `/`), wallets, history (?owner filters), settings (D-80, D-89, D-91)
  wallet-detail.tsx          # one account: balance, Send / Receive / Scan, tokens, activity (D-89)
  send/                      # index (form with the From selector), review, result (D-60, D-90)
  receive.tsx
  scan.tsx                   # ?from=send returns to the form; otherwise opens Send
  tokens.tsx                 # add, hide and remove ERC-20 tokens
  appearance.tsx, language.tsx, security.tsx, privacy.tsx, about.tsx   # settings groups (D-71, D-77)
  default-account.tsx        # picks the default account for transfers (D-92)
  enable-biometrics.tsx, private-key.tsx                  # opened from Security (D-69, D-70)
  account-switcher.tsx       # fixed-height sheet: the send form's account picker (D-88, D-90)
  wallet-add.tsx, account-menu.tsx    # short action sheets, as tall as their content (D-88)
  personalize.tsx            # name, color and icon of a card (?index), or a wallet's name and color (D-88)
  add-account.tsx            # picks the wallet a new account goes to, when several can take one (D-88)
  wallet-create.tsx          # another wallet: phrase, quiz, personalize; ?walletId resumes (D-78)
  wallet-import.tsx          # another wallet; ?recover=<id> restores one unreadable wallet (D-78)
  remove-wallet.tsx          # ?walletId names the wallet; without it the only wallet, or a picker first (D-78, D-94)
  tx/[hash].tsx              # tx detail (local or scanned)
  lock.tsx
src/
  app/        routes/ (navigator layouts + auth guard), model/ (bootstrap, auto-lock), styles/
  pages/      full-screen compositions, one slice per screen
  widgets/    composite blocks (balance-card, asset-list, history-list, wallet-grid)
  features/   user actions (see below)
  entities/   business objects (wallet, account, asset, network, transaction)
  shared/
    api/      rpc provider factory
    config/   env, constants
    lib/      pure helpers (amount, address, logger, crypto-safe utils)
    ui/       design-system components (Button, Input, Screen, SettingsRow, ...), theme/ (tokens, ThemeRoot)
    model/    display preferences: appearance store, hide-balances reveal, amount display hook
    i18n/     locales/en.json, locales/id.json, setup
```

Auth guard (D-36): the root and onboarding layouts wrap screens in `Stack.Protected`, driven by wallet status and session state. Every group's `redirectTo` comes from one function, `resolveEntryRoute({ status, isUnlocked, isRecoveryRequired })`: `none` → welcome (or recover when recovery is required, D-39), `pendingBackup` → backup, `pendingPin` → set-pin, `active` → lock or home. Protected screens never render, and a status change redirects automatically, so features change state instead of navigating.
The FSD `app` layer has no `ui` segment (Steiger `fsd/no-ui-in-app`); navigator layouts live in `src/app/routes`.

Headers (D-60): every sub-screen of the root stack uses `useSubScreenHeader()` (`src/app/routes/header-options.ts`; a hook, because its colors follow the theme): a translated centered title and an icon-only back button, so a route group name never shows. Screens without back are deliberate: the tabs, lock, the send result (Done only) and the auto-advancing onboarding steps.

Route file example:
```ts
// app/(tabs)/index.tsx
export { HomePage as default } from '@/pages/home';
```

### Features
`create-wallet`, `import-wallet`, `backup-mnemonic`, `verify-mnemonic`, `setup-pin`, `unlock-app`, `send-transaction`, `receive-qr`, `scan-qr`, `manage-tokens`, `change-language`, `change-appearance`, `change-pin`, `lock-settings`, `reveal-mnemonic`, `reveal-private-key`, `reset-wallet`, `select-network`, `manage-accounts`, `error-reporting`.

A page slice may hold the screens of one flow: `pages/send` (form, review, result), `pages/history` (list, tx detail), `pages/settings` (the tab, Appearance, Language, Security, enable biometrics, private key, Privacy, About) and `pages/wallets` (the tab, its sheets, the account picker, the wallet detail, personalize, create and import another wallet). The features layer is at the limit too: wallet management lives in `manage-accounts` and removing one wallet in `reset-wallet`. This keeps the pages layer under Steiger's 20-slice limit without slice groups, which the deep-import ESLint rule would refuse.

### Slice segments
`ui/`, `model/` (Zustand store, selectors, types), `api/` (RPC calls), `lib/` (pure helpers), `config/`. Each slice exposes only `index.ts`.

### Import rules (enforced by Steiger and ESLint)
1. A layer imports only from layers **below** it: app > pages > widgets > features > entities > shared.
2. No imports between slices in the same layer.
3. Import a slice only through its `index.ts`. No deep imports.
4. `shared` knows nothing about business logic.

## 5. Wallet and key handling

- Wallets (D-78): the app holds up to `MAX_WALLETS` (10) wallets. A wallet is one secret (a recovery phrase or a private key) and its accounts; one wallet and one of its accounts are active at a time. The wallet store (`muvo.wallet`, version 4, public data) keeps `wallets` (id, number, name, color, source, origin, addedAt, `isBackupPending`, `needsRecovery`, accounts with index, address, name, color and icon), the `defaultAccount` (wallet id and index) the user set for transfers and `hasDefaultMovedNotice` (D-92). The account in use (`activeWalletId`/`accountIndex`/`address`/`source`: the one on screen, or the source of the send being written) is session state: it is not stored and starts as the default account. The PIN, the lockout and biometrics are app-wide. A wallet whose backup is pending or whose secret is unreadable cannot be made active, sign or add accounts.
- Derivation: BIP-39 mnemonic (12 words), BIP-44 path `m/44'/60'/0'/0/{index}`. A wallet starts with index 0; the user can add more accounts (index 1, 2, …) from the same mnemonic, switch between them and name them (D-44). Private-key wallets have exactly one account.
- Derivation wrapper: all mnemonic → account derivation goes through `deriveAccount()` in `entities/wallet/lib/derive.ts`. ethers v6 `fromPhrase` runs PBKDF2 in pure JS and blocks the Hermes JS thread, so the wrapper waits for a painted frame first and the UI shows a Reanimated (UI-thread) progress animation. Swapping the PBKDF2 backend later only touches this function (Q-30).
- Import: mnemonic (12 or 24 words) or raw private key. A private-key import has no mnemonic and cannot derive more accounts. The import screen shows a mandatory "back up this key yourself" warning that the user must acknowledge (D-28).
- SecureStore layout (D-79): one item per wallet, `muvo.wallet.secret.<id>` with a random 32-hex id, plus `muvo.wallet.ids`, the index of ids that may hold a secret (SecureStore cannot list keys, and the metadata is in AsyncStorage, which a reinstall loses). An id enters the index before its secret is written and leaves it after the secret is deleted, so the index is always a superset. The wallet of a pre-multi-wallet install keeps its original item `muvo.wallet.secret` under the fixed id `legacy`: upgrading migrates only the public metadata (pure, deterministic, repeatable) and never rewrites, copies or deletes a key. Every lookup (signing, key export, reveal, add account, integrity check) goes by wallet id; `signWithSecret` and `exportPrivateKey` still refuse a secret that does not produce the account's address.
- Import guard (D-78): a phrase or key whose first address already belongs to any account of any wallet is refused, and so is a wallet past the limit.
- Storage: mnemonic or private key goes in `expo-secure-store` with `keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY`. It is never put in Zustand, AsyncStorage, logs, Sentry, or navigation params. The clipboard only ever receives public data (the user's own address, and the build info from About, D-72); there is no copy action for the mnemonic or a private key. "Show private key" (D-70) reveals the key of one named account (a wallet's first account from Settings, D-94) behind the same gates as the phrase. After the check both secrets stay masked until the eye is pressed, and mask themselves again after 30 s (D-74).
- Onboarding state (D-32): a new mnemonic goes to SecureStore immediately, and the wallet status (persisted, non-secret) moves `none` → `pendingBackup` → `pendingPin` → `active`; imports go `none` → `pendingPin` → `active`. A killed app resumes at the step for its status. The status follows the first wallet only. A wallet created later carries its own `isBackupPending` (D-78): it sits in the Wallets tab as "Backup not finished" until its phrase was shown (screenshots blocked) and its 3-word quiz passed, and the create screen shows a phrase only while that flag is set.
- Fresh install (D-33): the iOS Keychain survives uninstall but AsyncStorage does not. If the `muvo.installed` marker is missing at startup, all of the app's SecureStore items are wiped before anything reads them: the legacy secret, every wallet in the id index, the index, the PIN record and the lockout state.
- Startup integrity check, per wallet (D-39, D-78): each wallet's secret is checked on its own. If the PIN record is gone or no wallet is readable, the rule below applies to the whole app. If only some wallets are unreadable, those are flagged `needsRecovery`, the active account moves to a readable wallet and the others keep working; the Wallets tab offers to restore each flagged wallet (the same wallet's phrase or key, checked against its first address and kind) or to remove it. A wallet store that failed to load is never acted on.
- Whole-app rule (D-39): after the fresh-install check and store hydration, the persisted status must match what SecureStore can still read. `pendingBackup` and `pendingPin` need a readable secret; `active` needs a readable secret and a readable PIN record; `none` needs nothing. On a mismatch the app does not open the lock screen: it wipes local wallet data through the reset-wallet flow and routes to `/recover`, which explains the data couldn't be read and offers import by mnemonic or private key (reusing import-wallet) or starting a new wallet. The recovery state is persisted, so a killed app returns to `/recover`. The check reads the secret only to validate its shape; the value never leaves the wallet entity (`hasReadableWalletSecret`).
- Signing: read the secret from SecureStore **after successful auth**, build the `Wallet`, sign, and drop the reference immediately. Do not keep a long-lived `Wallet` object in global state.
- Backup flow (create wallet): show the 12 words once, block screenshots (`expo-screen-capture`), then force a verification quiz (re-enter 3 random words) before the wallet is activated.
- PIN screens (D-59): every PIN entry (lock, set-pin, change PIN, `PinPrompt` before send, reveal and remove wallet) renders `PinEntry` from `shared/ui`: header at the top, keypad anchored to the bottom, keys scaled to the screen.
- Auth: user sets a 6-digit PIN at onboarding. PIN is stored as a salted hash, never plain. Biometrics are optional on top of the PIN, and PIN is always the fallback. Turning biometrics on needs the PIN and then a successful biometric check; if the device later loses its enrolment the setting switches itself off with a notice (D-69). Face ID inside Expo Go is shown as unavailable with the reason, and a failed prompt says why (D-73).
- PIN hashing goes through one `PinHasher` interface in `entities/auth` with the algorithm and parameters in `entities/auth/config`. SecureStore holds a versioned record `{ v, algo, iterations, salt, hash }`; verification uses the record's own params, and an outdated record is rehashed after a successful unlock (D-34). The KDF is a placeholder until Q-32 is decided.
- Auth is required: on app open, after returning from background past the auto-lock timeout, and **before every transaction signature** and before revealing the mnemonic.
- Auto-lock: 1 minute default, user-adjustable (immediately, 1, 5, 15 min).
- PIN brute force: escalating lockout after failed attempts. After 10 failures, offer wallet reset (this wipes local keys; recovery requires the mnemonic). The failed count, lockout-until and lastSeenAt live in SecureStore, not in a persisted store (D-27). If the clock goes backwards during a lockout, the lockout restarts from now. Biometrics are not offered while a lockout runs.
- Reset wallet: confirm twice, wipe SecureStore (every wallet) and persisted stores, return to onboarding. From the lock screen (after 10 failures) it is two confirmations and removes all wallets. "Remove wallet from this device" (D-45, D-78) removes one wallet, the one picked in Settings (D-94) or in the Wallets tab: a strong warning that names the wallet with a "I have my recovery phrase" acknowledgement, the PIN, then a final confirmation. Its key, accounts and sent-transaction records go; the other wallets and the PIN stay. Removing the last wallet is the full reset. "Lock now" only locks the session.
- Default account (D-92): Settings > "Default account for transfers" lists every usable account by wallet (icon, name, short address, balance through `useAmountDisplay()`) with a check on the default; a card's menu has "Set as default". Only these two change it. Transfer and Scan QR on Home start from it. It decides nothing else: the one-wallet actions in Settings ask which wallet (D-94). When its wallet is removed or cannot be read, the first usable account becomes the default and Home says so once, naming it.
- Settings (D-46, D-71): the tab lists the groups, each on its own screen. Security holds change PIN (current PIN, then the new one twice), the biometrics switch (D-69), the auto-lock timeout (persisted in `muvo.auth.prefs`), lock now, the recovery phrase, the private key (D-70), the wrong-PIN counter and remove wallet. The phrase, the key and remove wallet each act on one wallet that is never guessed (D-94): with one wallet they go straight to it, with several a short picker comes first (`WalletTarget` in `entities/wallet`), and every step names the wallet with its first account's short address. The phrase is read only after a PIN or biometric check, screenshots are blocked on that screen, and the words are dropped on Hide, on leaving the screen and when the app leaves the foreground. Private-key wallets show no phrase; their key is shown by "Show private key" (D-70). Every PIN check, including these, shares the lockout.

## 6. Transaction flow

0. Source (D-90, D-92): the form's "From" row shows the account in use with its balance and opens the account picker. From Home (Transfer, Scan QR) that is the default account the user set; from an account's own screen it is that account, for that send only. Picking another account in the form changes the source of that send only, loads its balances and clears what was checked against the old one; it never changes the default. On "Review" the draft takes that account (`draft.from`: wallet id, index, address); the review shows it and the signature is made for it, whatever the account in use is by then.
1. Form: recipient (`checkAddress`: lowercase or a valid EIP-55 checksum; a bad mixed-case checksum is refused) and a locale-aware amount (`parseAmountInput`: bigint base units, never floats, D-51). Paste, scan (prefill only) and "Max" (CMU: balance minus the quoted fee; token: the whole balance).
2. Quote: `estimateGas` (a revert fails early with a friendly message) and `getFeeData()`. Fee mode at runtime: `maxFeePerGas` → EIP-1559 (type 2), else legacy `gasPrice` (type 0) (D-22; the nodes support EIP-1559, D-47). Warnings (never blocking): sending to yourself, recipient is a contract (`getCode` ≠ `0x`).
3. Review: from (account name + address), to (full), amount, fee (max), total, node. The fee is refetched when the screen opens and again before signing if older than 30 s. The balance check includes the fee; a token send needs CMU for gas separately.
4. Authenticate (PIN or biometric) right before signing, every time.
5. `eth_chainId` must be 1912 on the selected node. Nonce from `getTransactionCount(addr, 'pending')`. Read the secret of the wallet named in `draft.from`, sign with `chainId` set via `signWithSecret` (derivation wrapper; the signer is dropped before it returns), broadcast once (no retry). Persist the local `pending` record (hash, nonce, from, to, asset, amount, fee fields, node, createdAt) before navigating. A broadcast that times out is saved as uncertain so the poller settles it (D-53).
6. Poll (app-level, foreground only, backoff on errors): `pending` → `confirmed` (1 conf, shown as n/12) → `final` (`FINAL_CONFIRMATIONS`). Only `eth_getTransactionCount('latest')` (read first), `eth_getTransactionReceipt`, `eth_getTransactionByHash` and `eth_blockNumber` are used; txpool and debug are off on the nodes (D-48).
7. Replaced: no receipt for our hash but the nonce is used. Dropped: the node no longer returns the tx, the nonce is unused, and both held for 3 minutes since it first went unknown; a tx still in the pool stays pending however long. Reverted (receipt status 0): failed. Each state has a badge and an explanation.

Status screen (D-81): after authentication the review hands over to one screen that follows the real transfer. While it is signed and broadcast: a spinner and the stage, no success styling, no way back. When the node accepts it: a coin moves from the sender to the recipient (Reanimated only) and the text says "Sent to the network". From then on the status poller drives a ring and three steps (sent, confirmed n/12, final). The check mark and the success haptic come with the first confirmation, never earlier. Not sent, reverted, dropped, replaced and an uncertain broadcast each have their own state. `resolveSendPhase` (pure) maps the send outcome and the record's status to the phase; under reduce motion the same icons and text are shown without movement.

Speed up and cancel of a pending tx are out of scope (Q-36).

## 7. Assets (multi-coin ready)

```ts
type Asset =
  | { kind: 'native'; symbol: string; decimals: number }
  | { kind: 'erc20'; address: string; symbol: string; decimals: number; name: string | null; source: 'builtin' | 'custom' };
```
Native CMU is the default asset. ERC-20 uses a minimal ABI (`balanceOf`, `transfer`, `decimals`, `symbol`, `name`, `Transfer` event). The registry in `entities/asset` is native CMU + `BUILTIN_TOKENS` (config, empty until official tokens exist) + custom tokens the user adds, persisted per chain (`muvo.tokens`, not secret). Adding a token checks `getCode`, reads `symbol`/`decimals`/`name` (ABI string or bytes32) and shows an "unverified token" warning first. Tokens can be hidden (built-in) or removed (custom). Balances use `balanceOf`, four at a time, polled with the native balance and cleared on account or node change (D-55).

## 8. History

No indexer is assumed (Q-11). History covers every usable account at once (D-91). Three `TransactionSource`s (`entities/transaction/api/history-sources.ts`), merged into one row per hash and own address (D-54); a transfer between two own accounts gives two rows, the sender's and the recipient's:
- Local records for transactions sent from this app (instant, live status from the poller).
- Native transfers: bounded block scan, `NATIVE_SCAN_PAGE_BLOCKS` (1,000) full blocks per page within `NATIVE_SCAN_WINDOW_BLOCKS` (50,000, about 7 days), fetched 50 at a time so ethers batches them. Each block is fetched once and checked against all own addresses. Only top-level txs with a value.
- ERC-20: `getLogs` on the `Transfer` topic for the listed tokens with the own addresses as a topic OR-array (one "sent" and one "received" query for all of them), in `LOGS_CHUNK_BLOCKS` (10,000) ranges that halve (down to 500) when a node refuses one.
- What was found is cached in memory per address, with one cursor per source; all addresses share one session head, so their pages line up. A page is loaded for the addresses least far back together. An account added later is scanned alone from the session head until it has caught up; the others are not rescanned. Pages load lazily (scroll or "load older"); pull to refresh forgets everything and starts from the new head. Values come from the node probe (D-47).
- The History tab shows all accounts, with a chip row (All, one per account) that filters what is shown; rows name their account. Home and the wallet detail show the newest ten rows of the same data.
- Known limitation: a block scan only sees top-level transactions. Native value moved by contract calls (internal transfers) is invisible without tracing or an indexer (Q-33); the History help text says so.

## 9. UI and i18n

- White and blue theme, matching the desktop app, in light and dark (System, Light, Dark; D-66) with six accent colors (D-68). Tokens live in `src/shared/ui/theme`; Tailwind classes read them as CSS variables that `ThemeRoot` sets on the root view, and code reads them with `useThemeColors()`. Never import a color value statically and never write a hex code in a component.
- Appearance preferences (D-71, `muvo.appearance`): density, text size, animations, time format, balance decimals, hide empty tokens, hide balances, hide the app in the app switcher. Balances and history amounts go through `useAmountDisplay()` (decimals and masking); the send form and review always show exact amounts.
- Languages: `id`, `en`. Files: `src/shared/i18n/locales/id.json` and `en.json`. Default = device language, fallback `en`; a language picked in Settings is stored (`muvo.language`, AsyncStorage) and restored during bootstrap, before the splash hides. No hardcoded user-facing strings.
- Amounts: show coin units only (e.g. `12.5 CMU`). Locale-aware number formatting; amount input accepts the locale's decimal separator (D-51). Dates via date-fns with the `id`/`en` locale. No fiat.
- Status and warnings never rely on color alone: badges and notices carry an icon and text.
- Home (D-89): an overview of all wallets. A carousel of account cards (the Wallets tab's card, one per page, snapping, with page dots and a last "Add" card), two actions (Transfer, Scan QR) and "Recent activity" of all accounts with "See all" to History. Pull to refresh reloads every balance and the activity. The header eye flips "hide balances".
- Wallet detail (D-89): a card tap, on Home or in the Wallets tab, opens the account's own screen: balance card, Send / Receive / Scan, tokens, that account's activity and the "…" menu. While it is in front its account is the one in use, which the balance card, the token list and a send started there read; nothing is drawn before that holds, and it is set again whenever the screen comes back to the front. Looking at an account never changes the default account (D-92).
- Wallets tab (D-80): between Home and History. One card per account, two per row, grouped by wallet with the wallet name as the section header. A card has the color the user chose (eight `card-colors.json` tokens; white text on every fill is checked at AA in both themes), the icon the user chose (D-84: one of a fixed set of lucide icons or emoji; an unknown stored icon shows the default), the account name, the native balance (through `useAmountDisplay()`, so "hide balances" masks it), the short address and a "Default" badge on the default account for transfers (D-92). Long-press or "…" opens its menu. The icon also shows in history rows, the send form's "From" row and the send review. The header eye flips the global "hide balances" setting; "+" opens the add sheet. Card balances are fetched for all accounts, four at a time, while Home or the tab is shown and the app is in the foreground.
- Sheets (D-88): a sheet is a short action menu that is exactly as tall as its content (`fitToContents`, no grabber), so nothing is behind a drag: the card menu (Personalize, Set as default unless it already is, Show receive QR, Remove wallet when the card is all the wallet has) and the add sheet (add an account, create a wallet, import a wallet). The account picker is the one sheet with a fixed height: the account in use sits above a list that scrolls inside it. Anything longer is a page.
- Personalize (D-88): one page for every card's look, also the last step of adding an account and of creating or importing a wallet. The preview stays at the top and Save at the bottom, above the keyboard; name, color and the full icon grid scroll between them. Nothing is saved before Save; Save is on only when something changed and the name is valid; leaving with changes asks first. A wallet's name and color use the same page, with the way to remove the wallet.
- Camera (D-76): the scanner shows Muvo's own explanation (what the camera is for, nothing is captured, Continue / Not now) before the OS prompt, and "Open settings" after a permanent denial.

## 10. Error reporting (D-77)

`shared/lib/diagnostics` is the only code that touches the Sentry SDK. It starts before the first screen when `EXPO_PUBLIC_GLITCHTIP_DSN` is set, and is a no-op otherwise. Reporting is opt-out (`muvo.error-reporting`): a one-time notice over the app after PIN setup, or on the next unlock for an existing install, explains what is sent; nothing is sent before it is acknowledged, and the switch in Settings > Privacy closes or restarts the SDK at once. Every event is rebuilt from an allowlist and every string scrubbed (phrases, 64-hex, addresses, PIN-like digits, URLs down to their host); breadcrumbs are only our logger's lines and route patterns. Reports wait in a capped AsyncStorage queue (30 reports, 512 KB, 30 days) until the GlitchTip server, which is LAN/ZeroTier only, is reachable. `logger.error` is the way to report: features never call the SDK. Expo Go reports JS errors; native crashes need a development or release build.

## 11. Config

Only non-secret values via `EXPO_PUBLIC_*`: `EXPO_PUBLIC_RPC_URLS` (comma-separated preset nodes), `EXPO_PUBLIC_CHAIN_ID`, the optional `EXPO_PUBLIC_EXPLORER_URL` (tx links appear only when it is set, Q-27) and the optional `EXPO_PUBLIC_GLITCHTIP_DSN` (error reporting is fully off without it, D-77). Anything in the app bundle is public. Never put API keys or credentials in the app.

Source maps (D-82): the `@sentry/react-native/expo` config plugin uploads them during a native build and `getSentryExpoConfig` in `metro.config.js` puts a debug id in every bundle. The upload reads `SENTRY_URL`, `SENTRY_ORG`, `SENTRY_PROJECT` and `SENTRY_AUTH_TOKEN` from the build environment only; they are never `EXPO_PUBLIC_*` and never committed.

Releases (D-85, D-86, D-87): pushing a `v*` tag (the bump script does) runs `.github/workflows/release.yml`, which prebuilds, builds a signed universal APK and attaches it with its SHA-256 to a draft GitHub Release; a manual run makes a preview APK as a workflow artifact. Three local config plugins in `plugins/` shape the generated Android project: `android-version` (versionCode from the semver core, versionName the full version), `android-signing` (a release signingConfig that reads the keystore from the build environment) and `android-network-security` (release builds are HTTPS-only except cleartext for the build-time node hosts, plus the GlitchTip certificate as a trust anchor for its own host). `android/` is never committed.

Build info (D-72, D-75): `scripts/generate-build-info.js` writes the untracked `build-info.json` (version, codename, commit, branch, dirty flag, build time, channel (`dev`, `ci`, `preview`, `release`), CI run) whenever Metro starts (`metro.config.js`), on install and in CI; Jest reads a fixture. `shared/config` reads it, and Settings > About shows and copies it. It holds nothing secret and nothing about the build machine.
