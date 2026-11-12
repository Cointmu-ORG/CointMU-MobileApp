# Muvo

Non-custodial mobile wallet for the CointMU chain (Expo + React Native).

## Release Workflow

Releases run through `scripts/bump-version.js`, a thin wrapper around `npm version` ported from the desktop app. It refuses to run off `main`, with uncommitted changes, or behind `origin/main`, and refuses a version that is not semver or not newer than the current one. It checks every file before anything is written, then `npm version` bumps `package.json` and `package-lock.json`, the `version` hook (`scripts/sync-release-files.js`) stamps the codename and sets `app.json` `expo.version` (without a prerelease suffix), and npm creates the release commit and annotated `v*` tag. The script pushes the commit and tag atomically. If anything fails before the push lands, it deletes the tag and resets to the starting commit, so a failed release leaves nothing behind locally.

Pushing the tag starts the release build (see [Android releases](#android-releases)). `android.versionCode` is not stored anywhere: it is derived from the version at build time (D-85 in `.agent/decisions.md`).

**Usage:**

```bash
node scripts/bump-version.js <bump-type> <codename> [--preid=<id>] [--dry-run] [npm-version-flags]
```

`<bump-type>` is `major`, `minor`, `patch`, `premajor`, `preminor`, `prepatch`, `prerelease`, or an explicit version.

**Examples:**

- Preview a release without writing anything:
  ```bash
  node scripts/bump-version.js minor Siren --dry-run
  ```
- Bump the patch version (e.g., from 1.0.0 to 1.0.1):
  ```bash
  node scripts/bump-version.js patch Siren
  ```
- Start a beta prerelease (e.g., to 1.1.0-beta.0):
  ```bash
  node scripts/bump-version.js preminor Siren --preid=beta
  ```

## Android releases

`.github/workflows/release.yml` builds the Android APK on a GitHub runner (D-86, D-87). No EAS account, Android Studio or local keystore is involved.

**Cut a release:**

1. On an up-to-date `main`: `node scripts/bump-version.js <bump-type> <codename>`. It commits, tags `v<version>` and pushes both.
2. The tag starts the **Release** workflow. It checks that the tag matches `package.json`, builds a signed universal APK and creates a **draft** GitHub Release holding `Muvo-<version>-<codename>.apk`, its `.sha256` file and the notes (changes by category from `.github/release.yml`, plus version, versionCode, commit, build time and the SHA-256).
3. Review the draft: install the APK on a phone, check the notes.
4. Publish the draft. Until then nobody outside the repository sees it.

A failed run can be re-run: it replaces the draft's files and never touches a published release.

**Make a test build:** Actions > Release > Run workflow on any branch, or `gh workflow run release.yml --ref <branch>`. The APK is a workflow artifact only (no release, no tag), named `…-preview.apk`. Without the signing secrets it is signed with the debug key and named `…-unsigned-preview.apk`; such a build cannot be installed over a real release.

**Repository variables** (Settings > Secrets and variables > Actions > Variables; public values):

| Variable               | Required | Value                                                                                                                                                                                     |
| ---------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_RPC_URLS` | yes      | Preset RPC nodes, comma-separated. `http://` hosts named here are the only ones the release APK may reach without TLS.                                                                    |
| `EXPO_PUBLIC_CHAIN_ID` | yes      | `1912`                                                                                                                                                                                    |
| `GLITCHTIP_CERT_PEM`   | no       | The PEM certificate of a GlitchTip server with a self-signed certificate. Trusted for the DSN host only. Print it with `openssl s_client -connect <host>:443 </dev/null \| openssl x509`. |

**Repository secrets:**

| Secret                                                            | Required      | Value                                                                                                                                                         |
| ----------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ANDROID_KEYSTORE_BASE64`                                         | for a release | The release keystore, base64: `base64 -w0 release.keystore`                                                                                                   |
| `ANDROID_KEYSTORE_PASSWORD`                                       | for a release | Keystore password                                                                                                                                             |
| `ANDROID_KEY_ALIAS`                                               | for a release | Key alias                                                                                                                                                     |
| `ANDROID_KEY_PASSWORD`                                            | for a release | Key password                                                                                                                                                  |
| `EXPO_PUBLIC_GLITCHTIP_DSN`                                       | no            | Error reporting DSN; without it the build has reporting disabled                                                                                              |
| `SENTRY_AUTH_TOKEN`, `SENTRY_URL`, `SENTRY_ORG`, `SENTRY_PROJECT` | no            | Source map upload to GlitchTip (D-82); skipped without the token. A GitHub runner cannot reach a LAN-only server, so a failed upload does not fail the build. |

> **Back up the keystore and its passwords, in more than one place, outside this repository.** Android only installs an update signed with the same key. If the keystore is lost, no existing install can ever be updated: every user has to uninstall Muvo (which deletes the wallet keys on the phone) and install a new app. GitHub secrets cannot be read back, so the secret is not a backup. Never commit a keystore; `*.keystore`, `*.jks` and `keystore.b64` are gitignored.

**Network rules of the release APK (D-87):** HTTPS only, except plain `http://` to the hosts in `EXPO_PUBLIC_RPC_URLS` and the DSN at build time. A custom `http://` node on another host is refused in the app with an explanation. The GlitchTip server's self-signed certificate is trusted for its own host only, and only in this APK: Expo Go and iOS cannot reach that server until it has a publicly trusted certificate (Q-02).
