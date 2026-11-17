# Security Policy

OneScreen reads raw mouse movement and changes display settings, so we take security reports
seriously.

## What OneScreen does and doesn't do

- It reads **mouse movement only**: no keystrokes, no screen contents, no camera.
- It makes **no network requests**. "About OneScreen" opens this repository in your browser.
- It stores one settings file locally (see the README) and, if you turn on *Launch at login*,
  a LaunchAgent (macOS) or a `Run` registry value (Windows).

## Reporting a vulnerability

Please **don't** open a public issue. Use
[GitHub's private vulnerability reporting](https://github.com/mxnyawi/OneScreen/security/advisories/new).
You'll get an acknowledgement within a week. Please give us a reasonable amount of time to
release a fix before disclosing it.

## Supported versions

Only the latest release gets security fixes.
