# Decisions

Format: ID, decision, reason. Add a new entry (never silently rewrite) when something changes.

Note: D-11 and D-17 are intentionally unused (the history-source topic is tracked as Q-11).

## Decided

- **D-01 Expo managed + TypeScript strict.** Dev on Linux/Windows without a Mac, Expo Go for fast testing, EAS Build for release.
- **D-02 Expo Router.** Industry default for Expo. Routes in root `app/`, thin re-exports.
- **D-03 FSD adapted.** FSD layers in `src/`, root `app/` reserved for routes to avoid the Expo Router name clash.
- **D-04 ethers v6.** Already used in desktop (TypeScript), logic can be reused. Needs `react-native-get-random-values`.
- **D-05 Zustand.** Same as desktop. Persist only non-sensitive state.
- **D-06 NativeWind v4.** Tailwind in React Native, works in Expo Go.
- **D-07 i18next, JSON per language (`id`, `en`).** Same approach as desktop.
- **D-08 No monorepo.** Blockchain code from desktop is copied manually, then adapted (remove Node/Electron APIs).
- **D-09 HTTP polling, no WebSocket.** Simpler and more robust on mobile networks.
- **D-10 Non-custodial, single account in MVP.** Data model keeps `accountIndex` for later multi-account.
- **D-12 BIP-44 `m/44'/60'/0'/0/0`, 12-word mnemonic.** Industry standard for EVM wallets, compatible with MetaMask-style import.
- **D-13 Import via mnemonic and private key.**
- **D-14 Backup flow.** Show mnemonic once, block screenshots, require 3-word verification quiz.
- **D-15 PIN (6 digits, hashed) + optional biometrics.** Required at app open, after auto-lock, before each signature, and before revealing the mnemonic.
- **D-16 Auto-lock 1 min default (configurable). 10 failed PINs offers reset.**
- **D-18 Light theme only (white/blue) for MVP.** Matches desktop.
- **D-19 No fiat conversion.** Coin units only. Use `N/A` if a price field appears.
- **D-20 Linter: Steiger + ESLint boundaries.** Fails CI on FSD violations.
- **D-21 Testing: Jest + RNTL, E2E (Maestro) after MVP.**
- **D-22 Fee mode detected at runtime.** EIP-1559 if `getFeeData()` gives `maxFeePerGas`, else legacy `gasPrice`.
- **D-23 Finality default `FINAL_CONFIRMATIONS = 12`.** Show "confirmed" at 1. Tune once block time and hashrate are known.
- **D-24 `.agent/` docs are referenced from `CLAUDE.md`** (Claude Code does not auto-read `.agent/`).
- **D-25 App name: Muvo.** Display name "Muvo", tagline suggestion: "Muvo, dompet CointMU". Name is invented (Mu from CointMU, "vo" read as move/value/vault). Identifiers: slug `muvo`, scheme `muvo`, bundle ID / package name `com.cointmu.muvo` (iOS and Android). The bundle ID is permanent after the first store release; do not change it. Display name can be changed anytime. TODO before first publish: check availability on Play Store, App Store, and domain/social handles, and check for existing trademarks named "Muvo" (e.g. Creative MUVO speakers).
- **D-26 Expo Router root pinned to `./app`.** `["expo-router", { "root": "./app" }]` in app.json. Expo Router can treat `src/app` as the routes root, which clashes with the FSD `app` layer (D-03). Pinning makes root `app/` the only routes folder.
- **D-27 PIN lockout state lives in SecureStore.** Failed-attempt count, lockout-until and lastSeenAt are stored in SecureStore (`muvo.auth.lockout`), not in a persisted Zustand store. AsyncStorage is unencrypted and easier to tamper with; next to the PIN record the counter gets the same protection and is wiped together with it. If the device clock goes backwards (`now < lastSeenAt`) while a lockout is running, the lockout restarts from now. Moving the clock forward still ends a lockout early; only a server clock could prevent that.
- **D-28 Private-key imports show a mandatory "back up your key" warning.** A private-key wallet has no mnemonic and the key is stored only in the device keychain, so the user must tick an acknowledgement before importing.
- **D-29 Local tx records store the nonce.** Needed to detect replaced or dropped transactions. The nonce is fetched with `getTransactionCount(addr, 'pending')`.
- **D-30 Mobile uses Tailwind v3; desktop tokens are copied.** NativeWind v4 requires Tailwind v3 while the desktop app is on Tailwind v4 (`@theme`). Token values from the desktop `index.css` are copied into `src/shared/ui/theme/colors.json`, which both `tailwind.config.js` and code that needs raw colors read. Desktop names Inter but does not bundle it, so mobile uses the system font (no `expo-font`).
- **D-31 Steiger `fsd/insignificant-slice` is off.** The architecture defines slices that have a single consumer by design in the MVP (each feature, `entities/account`). Revisit once the slice set settles. All other recommended Steiger rules stay on.
- **D-32 New mnemonic is written to SecureStore right away, with wallet status `pendingBackup`.** Create flow: `none` → `pendingBackup` (phrase in SecureStore) → quiz passed → `pendingPin` → PIN set → `active`. Import flow: `none` → `pendingPin` → `active`. If the app is killed mid-onboarding, the router resumes at the step for the stored status. The wallet is only `active` after the quiz (create) and the PIN are done.
- **D-33 Fresh-install wipe for iOS reinstalls.** The iOS Keychain survives uninstall but AsyncStorage does not. On startup, if the `muvo.installed` marker is missing from AsyncStorage, the wallet secret, PIN record and lockout state are deleted from SecureStore before anything reads them, then the marker is set. This must ship in the first public release; adding it later would wipe existing users' keys.
- **D-34 PIN stored as a versioned record.** SecureStore holds `{ v, algo, iterations, salt, hash }`, not just a hash. Verification uses the record's own params; after a successful unlock, a record whose params differ from the current config is rehashed. The KDF itself is still a placeholder (Q-32).
- **D-35 Committed `CLAUDE.md` imports `AGENTS.md`.** Supersedes D-24: rules are referenced from `AGENTS.md`, and a committed `CLAUDE.md` containing `@AGENTS.md` makes Claude Code load them. Machine-specific notes (graphify, Obsidian vault paths) move to the gitignored `CLAUDE.local.md`.
- **D-36 Auth guard uses Expo Router protected routes.** Root and onboarding layouts wrap screens in `Stack.Protected`, driven by wallet status and session state, with `redirectTo` computed by one function (`resolveEntryRoute`). Protected screens never render, and a status change redirects automatically. There is no root `app/index.tsx`: the home tab (`(tabs)/index`) owns `/`.
- **D-37 Icons are imported per file.** Use `lucide-react-native/icons/<name>` instead of the package barrel. The barrel pulls in about 2,000 icon modules (Metro does not tree-shake by default) and made Jest runs take minutes.

## Open questions (need an answer from the owner)

- **Q-01 Decimals of CMU.** Assumed 18. Confirm.
- **Q-02 RPC reachability.** `10.64.24.101:8585` is a private LAN address. A phone outside that network cannot reach it. Need a public HTTPS endpoint (VPS + reverse proxy) or a VPN for dev. Also plain HTTP is blocked by default on Android release builds and iOS ATS, so production needs HTTPS (or an explicit cleartext exception for dev only).
- **Q-03 EIP-1559 support.** Unknown. Check `londonBlock` in genesis or call `eth_feeHistory`. D-22 covers both cases meanwhile.
- **Q-04 Finality.** Confirm block time and reorg risk to set `FINAL_CONFIRMATIONS`.
- **Q-11 History source.** Desktop has an in-app explorer, so check how it reads data. Pure-RPC history for native transfers means scanning blocks, which is heavy. Decide between bounded scan (current plan) or a small indexer/explorer API.
- **Q-26 "Multi coin" meaning.** More ERC-20 tokens on CointMU only, or other chains too? Current design supports tokens on one chain, with chain config isolated so multi-chain can be added.
- **Q-27 Block explorer URL** for tx links on mobile. Desktop has it built-in, so there may be no public URL.
- **Q-28 Sentry.** Keep it on mobile? If yes, define scrubbing rules before enabling.
- **Q-29 App name checks (D-25).** Before first publish: check "Muvo" availability on Play Store, App Store, domain and social handles, and run a trademark check (including Creative MUVO).
- **Q-30 Mnemonic derivation performance.** ethers v6 runs BIP-39 PBKDF2 in pure JS, which is slow on Hermes. Derivation is behind one function (`entities/wallet/lib/derive.ts`). Options: (A) register a native pbkdf2 (e.g. react-native-quick-crypto; new dependency, needs a dev build), (B) also store the derived index-0 private key in SecureStore for signing and keep the mnemonic only for reveal. Undecided.
- **Q-31 When to move from Expo Go to a development build.** Needed for Sentry, iOS Face ID, and any native crypto.
- **Q-32 PIN KDF algorithm and parameters.** A 6-digit PIN has only 10^6 values, so the KDF must be slow. Current placeholder: PBKDF2-SHA256, 20,000 iterations, 16-byte salt (`entities/auth/config`). Tune on a real device; D-34 makes changing it safe.
- **Q-33 Native history via block scan cannot see internal transfers.** Value moved by contract calls (internal transactions) does not appear as a transaction to the user's address. Adds weight to Q-11.
