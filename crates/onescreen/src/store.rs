//! Settings and learned desks, as one JSON file:
//! macOS `~/Library/Application Support/OneScreen/state.json`,
//! Windows `%APPDATA%\OneScreen\state.json`.
#![cfg_attr(not(any(target_os = "macos", windows)), allow(dead_code))]

use std::fs;
use std::path::PathBuf;

use onescreen_core::State;

pub fn path() -> Option<PathBuf> {
    Some(dirs::config_dir()?.join("OneScreen").join("state.json"))
}

/// Missing or unreadable state falls back to defaults; a corrupt file is kept as `state.json.bad`.
pub fn load() -> State {
    let Some(p) = path() else {
        return State::default();
    };
    match fs::read_to_string(&p) {
        Ok(s) => serde_json::from_str(&s).unwrap_or_else(|_| {
            let _ = fs::rename(&p, p.with_extension("json.bad"));
            State::default()
        }),
        Err(_) => State::default(),
    }
}

/// Write atomically (temp file + rename) so a crash never leaves a half-written file.
pub fn save(state: &State) {
    let Some(p) = path() else { return };
    if let Some(dir) = p.parent() {
        let _ = fs::create_dir_all(dir);
    }
    let tmp = p.with_extension("json.tmp");
    if let Ok(json) = serde_json::to_string_pretty(state) {
        if fs::write(&tmp, json).is_ok() {
            let _ = fs::rename(&tmp, &p);
        }
    }
}
