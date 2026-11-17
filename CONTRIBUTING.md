# Contributing to OneScreen

Thanks for helping. Bug reports from real desks are the most valuable contribution right now:
every combination of laptop, monitor, dock and GPU behaves a little differently.

## Reporting a bug

[Open an issue](https://github.com/mxnyawi/OneScreen/issues/new/choose) using the bug template.
Include your OS version, how your displays are arranged (a screenshot of the display settings is
perfect), and what you expected to happen.

## Development setup

You need [Rust](https://rustup.rs) (stable), plus:

- **macOS:** Xcode Command Line Tools (`xcode-select --install`).
- **Windows:** [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
  with the "Desktop development with C++" workload.

```bash
git clone https://github.com/mxnyawi/OneScreen.git
cd OneScreen
cargo test --workspace          # core tests, run anywhere (Linux too)
cargo run -p onescreen          # run the app (macOS or Windows)
```

Before opening a pull request:

```bash
cargo fmt --all
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

CI runs the same checks on Linux, macOS and Windows.

## How the code is organised

```
crates/
  onescreen-core/   Pure Rust, no OS calls. Everything that decides what happens:
                      gesture.rs   edge-push detection (PRD G1–G9)
                      arrange.rs   where the display goes and where the cursor lands
                      memory.rs    per-desk layouts
                      engine.rs    the state machine: Events in, Actions out
                    tests/core.rs covers every rule plus a false-trigger trace.
  onescreen/        The app: tray menu, event loop, settings file.
                      platform/macos.rs    NSEvent monitor, CoreGraphics, glow window
                      platform/windows.rs  Raw Input, SetDisplayConfig, layered glow window
demo/               The launch film (Remotion). Not part of the app.
scripts/            Packaging (macOS .app bundle).
```

The core never touches the OS, so behaviour is identical on both platforms and can be tested
with recorded traces. If you change how gestures are detected, add a test in `tests/core.rs`,
including a "this must not trigger" case.

## Testing on real hardware

There's no way to automate this, so please run through it on your setup before a release:

1. Two displays, monitor configured on the wrong side: push toward it. It should flip in under
   a second, the cursor should continue onto the monitor, and the edge should glow.
2. Undo from the menu restores the previous layout.
3. Unplug and replug the monitor: the remembered layout comes back about a second after the
   displays settle.
4. Normal use for a while (dragging windows, Hot Corners or the Start menu, scrolling at screen
   edges, games): nothing should flip.
5. Mixed scaling on Windows (100 % laptop + 150 % monitor): the monitor ends up aligned and
   centred.

## Pull requests

- Keep changes focused; one fix or feature per PR.
- Explain *why* in the description, and how you tested it (which OS, which displays).
- New behaviour comes with a core test where possible.

By contributing you agree that your work is released under the [MIT License](LICENSE).
