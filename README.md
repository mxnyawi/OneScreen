<div align="center">

# OneScreen

**Push your cursor toward a monitor. OneScreen moves it there.**

[![CI](https://github.com/mxnyawi/OneScreen/actions/workflows/ci.yml/badge.svg)](https://github.com/mxnyawi/OneScreen/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-c6ff4a.svg)](LICENSE)
![macOS 13+](https://img.shields.io/badge/macOS-13%2B-lightgrey)
![Windows 10/11](https://img.shields.io/badge/Windows-10%20%7C%2011-lightgrey)

<img src="docs/assets/demo.gif" alt="The cursor pushes against the laptop's edge, the monitor's position flips to the right side, and the cursor glides across" width="800">

</div>

You moved your laptop to the other side of your monitor, and now the mouse hits an invisible wall
because your computer still thinks the monitor is on the left. Normally you'd dig through display
settings and drag rectangles around. With OneScreen you just keep pushing the mouse toward the
monitor: the layout flips, the cursor carries on across, and the edge glows to show you where it
came through.

- **No setup.** No sensors, no camera, nothing to configure. It reacts to something you already do.
- **Remembers every desk.** Plug in at home or the office and that desk's layout comes back.
- **Stays out of the way.** It lives in the menu bar or tray, ignores corners, drags and games,
  and never sends anything over the network.

> **Status: early preview (v0.1).** It builds and passes its tests on macOS and Windows in CI, but it
> hasn't been run on many real desks yet. If something misbehaves,
> [please open an issue](https://github.com/mxnyawi/OneScreen/issues/new/choose).

---

## Install

### Download

Prebuilt downloads are on the [Releases page](https://github.com/mxnyawi/OneScreen/releases) once a
version has been published. They aren't code-signed yet, so the first launch needs one extra click:

<details>
<summary><b>macOS</b> (13 Ventura or later, Apple Silicon or Intel)</summary>

1. Download `OneScreen-macOS.zip` and unzip it.
2. Drag **OneScreen.app** into **Applications**.
3. Right-click it, choose **Open**, then **Open** again. (macOS blocks unsigned apps on a normal
   double-click. You only need to do this once.)

   If macOS says the app "is damaged", run this once in Terminal, then open it normally:
   ```bash
   xattr -dr com.apple.quarantine /Applications/OneScreen.app
   ```
4. A small two-screens icon appears in the menu bar. That's it.

</details>

<details>
<summary><b>Windows</b> (10 22H2 or 11)</summary>

1. Download `OneScreen-Windows.zip` and unzip it somewhere permanent, e.g. `C:\Program Files\OneScreen\`.
2. Double-click **onescreen.exe**. If SmartScreen appears, click **More info → Run anyway**.
3. The OneScreen icon appears in the system tray (you may need to click `^` to see it).

</details>

### Build from source

You need [Rust](https://rustup.rs). Install it with the command on that page and accept the
defaults. You also need the platform's build tools:

| | Build tools |
| --- | --- |
| macOS | Xcode Command Line Tools: `xcode-select --install` |
| Windows | [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/), with the **Desktop development with C++** workload |

Then:

```bash
git clone https://github.com/mxnyawi/OneScreen.git
cd OneScreen
cargo run --release -p onescreen
```

The first build takes a few minutes. After that, OneScreen runs from the terminal and shows up in the
menu bar or tray.

To make a proper app you can keep:

- **macOS:** `./scripts/bundle-macos.sh` builds `target/release/bundle/OneScreen.app`. Move it
  to Applications.
- **Windows:** `cargo build --release -p onescreen` builds `target\release\onescreen.exe`. Copy it
  wherever you like.

---

## Use it

1. Move the cursor toward your monitor.
2. If it stops at the edge, **keep pushing** for about half a second.
3. The monitor moves to that side, the cursor continues onto it at the same height, and the edge
   glows.

The new layout is saved for this desk (this exact set of displays). Next time you connect the same
displays, OneScreen restores the layout about a second after they settle.

### Menu

Click the icon in the menu bar (macOS) or tray (Windows):

| Item | What it does |
| --- | --- |
| **Enabled** | Turns OneScreen on or off. |
| **Sensitivity** | How hard you have to push: Low ≈ 700 pt, **Medium ≈ 400 pt** (default), High ≈ 250 pt, within 1.2 s. Try High on a trackpad. |
| **Remember layout per desk** | Restore each desk's layout when you plug its displays in again. |
| **Edge glow** | The flash on the edge the cursor enters through. It's also skipped when your system's reduce-motion setting is on. |
| **Pause during full-screen apps** | Windows only: ignore pushes while a game or presentation is full screen. |
| **Undo last flip** | Put the displays back where they were. |
| **Forget learned desks** | Clear every remembered layout. |
| **Launch at login** | Start OneScreen when you log in. |
| **About OneScreen** | Opens this page. |

### What doesn't trigger a flip

To stay out of your way, OneScreen ignores:

- the **corners** (Hot Corners, the Start button, close buttons),
- edges that **already lead to a display**,
- **sliding along** an edge on the way to a corner,
- anything while a **mouse button is held** (dragging, selecting),
- **mirrored** displays or a single display,
- a second flip within **2 seconds** of the last one.

---

## How it works

When the layout is wrong, the cursor stops at an edge but your hand keeps moving the mouse.
OneScreen reads that raw movement, which keeps arriving even when the cursor can't move, and adds up
the outward push. Once it passes the threshold, OneScreen:

1. Moves the other display to the side you pushed toward, centred along that edge. If that display is
   the main one (both systems pin it at 0,0), it moves your current display to the far side
   instead. With three or more displays it moves the one furthest from where you pushed.
2. Applies the change through the system's own display settings API, so it sticks exactly like
   a change made in Settings.
3. Moves the cursor to the matching point just inside the monitor's edge, and glows that edge.

| | macOS | Windows |
| --- | --- | --- |
| Mouse movement | `NSEvent` global monitor (`deltaX`/`deltaY`) | Raw Input (`WM_INPUT`, background sink) |
| Displays | CoreGraphics (`CGGetActiveDisplayList`, `CGConfigureDisplayOrigin`) | `QueryDisplayConfig` / `SetDisplayConfig` |
| Display identity | vendor / model / serial | EDID manufacturer / product + connector |
| Glow | Borderless click-through `NSWindow` | Layered click-through window |
| Launch at login | LaunchAgent in `~/Library/LaunchAgents` | `HKCU\…\CurrentVersion\Run` |

### Privacy

OneScreen reads **mouse movement only**: no keystrokes, no screen contents, no camera. It makes **no
network requests** and has no analytics. Windows asks for no permissions. macOS normally doesn't
either. If it ever asks for **Input Monitoring** or **Accessibility**, that's what allows OneScreen to
see mouse movement while other apps are in front.

### Where your settings live

| macOS | Windows |
| --- | --- |
| `~/Library/Application Support/OneScreen/state.json` | `%APPDATA%\OneScreen\state.json` |

It's plain JSON with your settings and learned desks. Delete it to start fresh.

---

## Troubleshooting

<details>
<summary><b>Nothing happens when I push</b></summary>

- Check that **Enabled** is ticked in the menu.
- Push straight toward the monitor, away from the corners. Pushes within 40 points of a corner
  are ignored on purpose.
- On a trackpad, set **Sensitivity → High**.
- Make sure no mouse button is held down.
- If the displays are mirrored, there's nothing to arrange.

</details>

<details>
<summary><b>It flips when I don't want it to</b></summary>

Set **Sensitivity → Low**, and [open an issue](https://github.com/mxnyawi/OneScreen/issues/new/choose)
describing what you were doing. False triggers are treated as bugs.

</details>

<details>
<summary><b>The screens go black for a second (Windows)</b></summary>

Some GPUs and docks blank the screens briefly whenever the layout changes. That includes changes made
in Settings. OneScreen waits for the change to finish before moving the cursor.

</details>

<details>
<summary><b>Wrong layout restored at a desk</b></summary>

Rearrange it the way you want, in Settings or with a push. OneScreen remembers the last layout you
used at each desk. **Forget learned desks** clears them all.

</details>

<details>
<summary><b>Uninstall</b></summary>

1. Turn off **Launch at login** in the menu, then **Quit OneScreen**.
2. Delete the app (`OneScreen.app` or `onescreen.exe`).
3. Optionally delete the settings folder listed above.

</details>

---

## Project layout

```
crates/onescreen-core   Platform-free logic: gesture detection, arranging, per-desk memory (fully tested)
crates/onescreen        The menu bar / tray app and the macOS and Windows layers
scripts/                Packaging (macOS .app bundle)
demo/                   The launch film, made in code with Remotion (see demo/README.md)
```

Run the tests with `cargo test --workspace`. They run anywhere, including Linux. See
[CONTRIBUTING.md](CONTRIBUTING.md) for the development setup, the architecture, and the
real-hardware test checklist.

## Roadmap

- Signed and notarised macOS builds, a Homebrew cask, a signed Windows installer, and WinGet
- A first-run window with a short animation of the gesture
- Cycling between displays with repeated pushes on 3+ display setups
- Naming desks and forgetting them one at a time
- An optional keyboard shortcut for trackpad users
- Linux (X11 / Wayland)

Ideas and votes are welcome in [issues](https://github.com/mxnyawi/OneScreen/issues).

## Contributing

Bug reports, especially "it did the wrong thing on my desk", are the most useful thing right now.
See [CONTRIBUTING.md](CONTRIBUTING.md). Please follow the [Code of Conduct](CODE_OF_CONDUCT.md), and
report security issues privately as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © OneScreen contributors
