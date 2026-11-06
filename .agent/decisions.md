# Decisions

Format: ID, decision, reason. Add a new entry (never silently rewrite) when something changes.

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

## Open questions (need an answer from the owner)

- **Q-01 Decimals of CMU.** Assumed 18. Confirm.
- **Q-02 RPC reachability.** `10.64.24.101:8585` is a private LAN address. A phone outside that network cannot reach it. Need a public HTTPS endpoint (VPS + reverse proxy) or a VPN for dev. Also plain HTTP is blocked by default on Android release builds and iOS ATS, so production needs HTTPS (or an explicit cleartext exception for dev only).
- **Q-03 EIP-1559 support.** Unknown. Check `londonBlock` in genesis or call `eth_feeHistory`. D-22 covers both cases meanwhile.
- **Q-04 Finality.** Confirm block time and reorg risk to set `FINAL_CONFIRMATIONS`.
- **Q-11 History source.** Desktop has an in-app explorer, so check how it reads data. Pure-RPC history for native transfers means scanning blocks, which is heavy. Decide between bounded scan (current plan) or a small indexer/explorer API.
- **D-25 App name: Muvo.** Display name "Muvo", tagline suggestion: "Muvo, dompet CointMU". Name is invented (Mu from CointMU, "vo" read as move/value/vault). Identifiers: slug `muvo`, scheme `muvo`, bundle ID / package name `com.cointmu.muvo` (iOS and Android). The bundle ID is permanent after the first store release; do not change it. Display name can be changed anytime. TODO before first publish: check availability on Play Store, App Store, and domain/social handles, and check for existing trademarks named "Muvo" (e.g. Creative MUVO speakers).
- **Q-26 "Multi coin" meaning.** More ERC-20 tokens on CointMU only, or other chains too? Current design supports tokens on one chain, with chain config isolated so multi-chain can be added.
- **Q-27 Block explorer URL** for tx links on mobile. Desktop has it built-in, so there may be no public URL.
- **Q-28 Sentry.** Keep it on mobile? If yes, define scrubbing rules before enabling.
