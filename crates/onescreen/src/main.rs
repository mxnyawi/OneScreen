//! OneScreen: push your cursor toward a monitor and the display layout follows.
#![cfg_attr(windows, windows_subsystem = "windows")]

#[cfg(any(target_os = "macos", windows))]
mod app;
#[cfg(any(target_os = "macos", windows))]
mod icon;
#[cfg(any(target_os = "macos", windows))]
mod platform;
mod store;

#[cfg(any(target_os = "macos", windows))]
fn main() {
    app::run();
}

#[cfg(not(any(target_os = "macos", windows)))]
fn main() {
    eprintln!("OneScreen runs on macOS and Windows. Linux support is on the roadmap.");
    std::process::exit(1);
}
