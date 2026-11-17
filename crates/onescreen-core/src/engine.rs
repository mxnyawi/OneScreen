//! The core state machine. Platform shells feed it [`Event`]s and carry out the
//! [`Action`]s it returns. It never calls the OS, so it behaves the same everywhere
//! and can be tested with recorded traces.

use serde::{Deserialize, Serialize};

use crate::arrange::{landing_point, plan_flip, Landing};
use crate::config::Config;
use crate::display::{disambiguate_keys, Display, DisplayId};
use crate::geometry::{Edge, Point};
use crate::gesture::{GestureDetector, Motion};
use crate::memory::{desk_id, facing_edge, Memory};

/// Displays must be stable this long before a desk's layout is restored (PRD M4).
pub const SETTLE_SECS: f64 = 1.0;
/// Give up waiting for the OS to report the new layout after this long.
pub const APPLY_TIMEOUT_SECS: f64 = 3.0;

#[derive(Clone, Debug, PartialEq)]
pub enum Event {
    Motion(Motion),
    /// The display configuration (may have) changed.
    Displays {
        t: f64,
        displays: Vec<Display>,
        mirrored: bool,
    },
    /// The shell finished an [`Action::Apply`]. `displays` is a fresh snapshot if it has one.
    Applied {
        t: f64,
        ok: bool,
        displays: Option<Vec<Display>>,
    },
    /// Wake-up requested through [`Engine::next_wake`].
    Tick {
        t: f64,
    },
}

#[derive(Clone, Debug, PartialEq)]
pub enum Action {
    /// Move these displays to these origins through the OS display settings API (A4).
    Apply(Vec<(DisplayId, Point)>),
    /// Move the cursor (A5).
    Warp(Point),
    /// Glow on an edge (A6). `along` is the cursor's relative position on that edge.
    Flash { display: DisplayId, edge: Edge, along: f64 },
    /// The change failed (A8).
    Beep,
    /// Config or memory changed: persist [`Engine::state`].
    Save,
}

/// Everything worth persisting.
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct State {
    pub config: Config,
    pub memory: Memory,
}

#[derive(Clone, Debug)]
enum After {
    /// A flip: warp the cursor across and glow the entry edge.
    Flip(Landing),
    /// A remembered desk was restored: a short glow confirms it (PRD §6.2).
    Restore,
    /// Undo: no glow, no warp.
    Quiet,
}

#[derive(Clone, Debug)]
struct Pending {
    expect: Vec<(DisplayId, Point)>,
    deadline: f64,
    after: After,
}

#[derive(Debug, Default)]
pub struct Engine {
    config: Config,
    memory: Memory,
    gesture: GestureDetector,
    displays: Vec<Display>,
    mirrored: bool,
    desk: Option<String>,
    settle_at: Option<f64>,
    pending: Option<Pending>,
    undo: Option<Vec<(DisplayId, Point)>>,
}

impl Engine {
    pub fn new(state: State) -> Self {
        Self { config: state.config, memory: state.memory, ..Default::default() }
    }

    pub fn state(&self) -> State {
        State { config: self.config.clone(), memory: self.memory.clone() }
    }
    pub fn config(&self) -> &Config {
        &self.config
    }
    /// Change settings, then persist with [`Engine::state`].
    pub fn config_mut(&mut self) -> &mut Config {
        self.gesture.reset();
        &mut self.config
    }
    pub fn displays(&self) -> &[Display] {
        &self.displays
    }
    pub fn desks_remembered(&self) -> usize {
        self.memory.desks.len()
    }
    pub fn can_undo(&self) -> bool {
        self.undo.is_some()
    }

    /// When the shell should send [`Event::Tick`] next, if at all.
    pub fn next_wake(&self) -> Option<f64> {
        match (self.settle_at, self.pending.as_ref().map(|p| p.deadline)) {
            (Some(a), Some(b)) => Some(a.min(b)),
            (a, b) => a.or(b),
        }
    }

    pub fn handle(&mut self, event: Event) -> Vec<Action> {
        match event {
            Event::Motion(m) => self.on_motion(m),
            Event::Displays { t, displays, mirrored } => self.on_displays(t, displays, mirrored),
            Event::Applied { t, ok, displays } => {
                if !ok {
                    self.pending = None;
                    self.undo = None;
                    return vec![Action::Beep];
                }
                match displays {
                    Some(d) => {
                        let mirrored = self.mirrored;
                        self.on_displays(t, d, mirrored)
                    }
                    None => vec![],
                }
            }
            Event::Tick { t } => self.on_tick(t),
        }
    }

    /// Restore the layout from before the last flip (A7).
    pub fn undo(&mut self, t: f64) -> Vec<Action> {
        let Some(prev) = self.undo.take() else {
            return vec![];
        };
        self.pending = Some(Pending { expect: prev.clone(), deadline: t + APPLY_TIMEOUT_SECS, after: After::Quiet });
        vec![Action::Apply(prev)]
    }

    /// Forget every learned desk (M7).
    pub fn forget_desks(&mut self) -> Vec<Action> {
        self.memory.forget_all();
        vec![Action::Save]
    }

    fn on_motion(&mut self, m: Motion) -> Vec<Action> {
        if self.pending.is_some() || self.mirrored {
            return vec![];
        }
        let Some(push) = self.gesture.on_motion(&m, &self.displays, &self.config) else {
            return vec![];
        };
        let Some(plan) = plan_flip(&self.displays, &push) else {
            return vec![];
        };
        self.undo = Some(
            plan.origins
                .iter()
                .filter_map(|(id, _)| self.displays.iter().find(|d| d.id == *id).map(|d| (*id, d.bounds.origin())))
                .collect(),
        );
        self.pending = Some(Pending {
            expect: plan.origins.clone(),
            deadline: m.t + APPLY_TIMEOUT_SECS,
            after: After::Flip(plan.landing),
        });
        vec![Action::Apply(plan.origins)]
    }

    fn on_displays(&mut self, t: f64, mut displays: Vec<Display>, mirrored: bool) -> Vec<Action> {
        disambiguate_keys(&mut displays);
        self.displays = displays;
        self.mirrored = mirrored;
        let mut out = Vec::new();

        if let Some(p) = &self.pending {
            if self.layout_matches(&p.expect) {
                out.extend(self.finish_pending());
            }
        }

        let id = desk_id(&self.displays);
        if self.desk.as_deref() != Some(id.as_str()) {
            // a different set of displays: wait for things to settle, then restore or learn
            self.desk = Some(id);
            self.settle_at = Some(t + SETTLE_SECS);
            self.gesture.reset();
            self.undo = None;
        } else if self.settle_at.is_some() {
            self.settle_at = Some(t + SETTLE_SECS);
        } else if self.pending.is_none() && self.remembering() && self.memory.remember(&self.displays) {
            // M5: same desk, new layout (ours or a manual change in Settings)
            out.push(Action::Save);
        }
        out
    }

    fn on_tick(&mut self, t: f64) -> Vec<Action> {
        let mut out = Vec::new();
        if self.pending.as_ref().is_some_and(|p| t >= p.deadline) {
            out.extend(self.finish_pending());
        }
        if self.settle_at.is_some_and(|s| t >= s) {
            self.settle_at = None;
            if self.remembering() {
                let desk = desk_id(&self.displays);
                let restore = self.memory.get(&desk).and_then(|l| l.restore_plan(&self.displays));
                match restore {
                    Some(origins) => {
                        self.pending = Some(Pending {
                            expect: origins.clone(),
                            deadline: t + APPLY_TIMEOUT_SECS,
                            after: After::Restore,
                        });
                        out.push(Action::Apply(origins));
                    }
                    None => {
                        if self.memory.remember(&self.displays) {
                            out.push(Action::Save);
                        }
                    }
                }
            }
        }
        out
    }

    fn remembering(&self) -> bool {
        self.config.remember_desks && self.displays.len() >= 2 && !self.mirrored
    }

    fn layout_matches(&self, expect: &[(DisplayId, Point)]) -> bool {
        expect.iter().all(|(id, p)| {
            self.displays
                .iter()
                .find(|d| d.id == *id)
                .is_some_and(|d| (d.bounds.x - p.x).abs() <= 1.0 && (d.bounds.y - p.y).abs() <= 1.0)
        })
    }

    fn finish_pending(&mut self) -> Vec<Action> {
        let Some(p) = self.pending.take() else {
            return vec![];
        };
        let mut out = Vec::new();
        match p.after {
            After::Flip(landing) => {
                if let Some(pt) = landing_point(&self.displays, &landing) {
                    out.push(Action::Warp(pt));
                }
                if self.config.glow {
                    out.push(Action::Flash { display: landing.display, edge: landing.edge, along: landing.along });
                }
            }
            After::Restore => {
                if self.config.glow {
                    if let Some(other) = self.displays.iter().find(|d| !d.primary) {
                        if let Some(edge) = facing_edge(&self.displays, other.id) {
                            out.push(Action::Flash { display: other.id, edge, along: 0.5 });
                        }
                    }
                }
            }
            After::Quiet => {}
        }
        if self.remembering() && self.memory.remember(&self.displays) {
            out.push(Action::Save);
        }
        out
    }
}
