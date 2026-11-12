# Conventions

## Code style
- TypeScript `strict: true`. No `any` without a comment explaining why.
- Path alias `@/*` -> `src/*`.
- Files and folders: `kebab-case`. React components: `PascalCase` named exports. Hooks: `useXxx`. Zustand stores: `useXxxStore`.
- One component per file. Prefer function components and hooks.
- Slice public API only through `index.ts`.

## Money and numbers
- Amounts are `bigint` (wei) internally. Convert with `parseUnits` / `formatUnits`.
- Never use `number` or `parseFloat` for token amounts.
- Format for display only at the UI edge, in one shared helper.

## Blockchain code
- All RPC access goes through `shared/api/rpc`. No `new JsonRpcProvider` elsewhere.
- Chain and asset config come from `entities/network` and `entities/asset`.
- Wrap RPC calls with timeout and retry. Show user-friendly errors; never raw RPC messages.
- Blockchain logic must be pure and testable (no React imports in `lib/` and `api/`).

## State
- Zustand slices live in the `model/` segment of their slice.
- Persist only non-sensitive data (settings, language, asset list, local tx history).
- Secrets are never in Zustand, even in memory-only stores.

## Styling
- NativeWind classes with theme tokens (blue and white palette). No inline magic colors.
- Reusable UI goes to `shared/ui`.

## i18n
- Keys are namespaced by feature, e.g. `send.review.title`.
- Every key must exist in both `en.json` and `id.json`.

## Testing
- Unit tests (Jest) are required for: amount helpers, address validation, mnemonic/derivation, fee-mode detection, tx status logic, PIN lockout logic.
- Component tests (RNTL) for critical flows: onboarding, backup verify, send review.
- Mock the provider. No test may hit a real RPC.
- E2E (Maestro) is post-MVP.
- Tests sit next to the code: `xxx.test.ts`.

## Lint
- ESLint + Prettier + Steiger. CI fails on boundary violations.

## Logging and errors
- Use the `shared/lib` logger wrapper only. No raw `console.log` in committed code.
- Logger and error reports must redact: mnemonic, private key, PIN, anything resembling a 64-hex string. Reports also redact wallet addresses, tx hashes and everything in a URL but its host (D-77).
- Report errors with `logger.error` (it becomes a GlitchTip report when reporting is on). Never import `@sentry/*` outside `shared/lib/diagnostics`, and never add an SDK integration, tag, context or breadcrumb without extending the scrubber's allowlist and its tests.

## Forbidden (hard rules)
1. Never log, print, serialize, or send to any service: mnemonic, private key, PIN, or derived seed.
2. Never store secrets in AsyncStorage, Zustand, URL/route params, or clipboard (except a deliberate user "copy address").
3. Never add a dependency without asking the user first.
4. Never break FSD layer or slice rules, or add deep imports, to "make it work".
5. Never use floats for token amounts.
6. Never hardcode RPC URL, chain ID, API keys, or credentials in source.
7. Never skip authentication before signing or revealing the mnemonic.
8. Never mark a transaction `final` before `FINAL_CONFIRMATIONS`.
9. Never add telemetry or analytics that captures wallet data.
10. Never run destructive git commands or modify files outside this repo.
11. Never copy-paste logic from the desktop repo that depends on Node or Electron APIs.
12. Never disable `strict`, lint rules, or tests to get past an error.

## Workflow
- Commit style and documentation language follow the user's global rules.
- When a decision is made or changed, add an entry to `decisions.md`.
- If a task conflicts with this file, stop and ask.
