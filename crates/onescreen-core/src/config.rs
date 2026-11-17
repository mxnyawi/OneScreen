use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum Sensitivity {
    Low,
    #[default]
    Medium,
    High,
}

impl Sensitivity {
    /// Outward push needed to flip, in points (PRD G2).
    pub fn threshold(self) -> f64 {
        match self {
            Sensitivity::Low => 700.0,
            Sensitivity::Medium => 400.0,
            Sensitivity::High => 250.0,
        }
    }
}

/// User settings. Every field has a default so old config files keep loading.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct Config {
    pub enabled: bool,
    pub sensitivity: Sensitivity,
    /// Restore each desk's layout when its displays are connected again (PRD §7.3).
    pub remember_desks: bool,
    /// Flash the edge the cursor enters through (PRD A6).
    pub glow: bool,
    pub launch_at_login: bool,
    /// Don't trigger while a full-screen game or presentation is in front (PRD G8, Windows).
    pub ignore_fullscreen: bool,
    /// Time window for the push, seconds (PRD G2).
    pub window_secs: f64,
    /// Pause after a flip before another can trigger, seconds (PRD G6).
    pub cooldown_secs: f64,
    /// Ignore this many points from each corner (PRD G4).
    pub corner: f64,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            enabled: true,
            sensitivity: Sensitivity::Medium,
            remember_desks: true,
            glow: true,
            launch_at_login: false,
            ignore_fullscreen: true,
            window_secs: 1.2,
            cooldown_secs: 2.0,
            corner: 40.0,
        }
    }
}
