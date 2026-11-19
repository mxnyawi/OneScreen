# Security Policy

OneScreen reads raw mouse movement and changes display settings, so we take security reports
seriously.

## What OneScreen does and doesn't do

- It reads **mouse movement only**: no keystrokes, no screen contents, no camera.
- It makes **no network requests**. "About OneScreen" opens this repository in your browser.
- It stores one settings file locally (see the README) and, if you turn on *Launch at login*,
  a LaunchAgent (macOS) or a `Run` registry value (Windows).

## How releases are built

- Every download on the [Releases page](https://github.com/mxnyawi/OneScreen/releases) is built
  by GitHub Actions from a tagged commit. Nothing is uploaded by hand.
- The release workflow uses only GitHub's own actions and its `gh` CLI. Its token is read-only
  except in the final publish step.
- Each release has a `SHA256SUMS.txt`. The one-line installers check the download against it and
  refuse to install on a mismatch.
- The installers never ask for admin rights and only touch the app itself, a Start menu shortcut
  (Windows), and a launch-at-login entry.

To check a download yourself:

```bash
shasum -a 256 OneScreen-macOS.zip                            # macOS
Get-FileHash -Algorithm SHA256 OneScreen-Windows.zip         # Windows (PowerShell)
```

and compare the result with `SHA256SUMS.txt` on the release page.

The builds aren't code-signed yet (that's on the roadmap), so macOS and Windows can't vouch for the
publisher. Prefer the one-line installers or the Releases page over copies from anywhere else.

## Reporting a vulnerability

Please **don't** open a public issue. Use
[GitHub's private vulnerability reporting](https://github.com/mxnyawi/OneScreen/security/advisories/new).
You'll get an acknowledgement within a week. Please give us a reasonable amount of time to
release a fix before disclosing it.

## Supported versions

Only the latest release gets security fixes.
