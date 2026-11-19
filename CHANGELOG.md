# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0]

First public preview.

- One-line installers for macOS (`install.sh`) and Windows (`install.ps1`): download, start,
  and turn on launch at login. No admin rights needed.
- Push the cursor against a dead screen edge to move the other display to that side
  (macOS 13+, Windows 10 22H2 / 11).
- The cursor carries on at the same relative height, and the entry edge glows.
- Remembers the layout for each desk (set of displays) and restores it on reconnect.
- Undo last flip; Low / Medium / High sensitivity; edge glow on/off; launch at login.
- Ignores corners, edges that already lead to a display, sliding along an edge, held mouse
  buttons, mirrored displays and (Windows) full-screen games and presentations.
