# Muvo

Non-custodial mobile wallet for the CointMU chain (Expo + React Native).

## Release Workflow

Releases run through `scripts/bump-version.js`, a thin wrapper around `npm version` ported from the desktop app. It refuses to run off `main`, with uncommitted changes, or behind `origin/main`, and refuses a version that is not semver or not newer than the current one. It checks every file before anything is written, then `npm version` bumps `package.json` and `package-lock.json`, the `version` hook (`scripts/sync-release-files.js`) stamps the codename and sets `app.json` `expo.version` (without a prerelease suffix), and npm creates the release commit and annotated `v*` tag. The script pushes the commit and tag atomically. If anything fails before the push lands, it deletes the tag and resets to the starting commit, so a failed release leaves nothing behind locally.

Native build numbers (`ios.buildNumber`, `android.versionCode`) are not touched; EAS remote versioning owns them (D-40 in `.agent/decisions.md`).

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
