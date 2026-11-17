//! Edge-push detection (PRD §7.1).
//!
//! When the layout is wrong the cursor stops at an edge with no display beyond it,
//! and the user keeps pushing. The cursor position stops changing, so we count the
//! raw outward mouse movement instead (G1) and trigger once enough has piled up
//! inside a short window (G2).

use std::collections::VecDeque;

use crate::config::Config;
use crate::display::{Display, DisplayId};
use crate::geometry::{Edge, Point, Rect};

/// One raw mouse movement sample.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Motion {
    /// Monotonic time in seconds.
    pub t: f64,
    /// Cursor position in global coordinates.
    pub pos: Point,
    /// Raw movement since the last sample (keeps reporting when the cursor is pinned).
    pub dx: f64,
    pub dy: f64,
    /// Any mouse button held (dragging, selecting): never trigger (G7).
    pub buttons: bool,
    /// A full-screen app or game is in front (G8). Shells that can't tell pass `false`.
    pub fullscreen: bool,
}

/// A detected push against a dead edge.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Push {
    pub display: DisplayId,
    pub edge: Edge,
    pub at: Point,
}

/// Distance from an edge that still counts as "at" it.
const EDGE_TOLERANCE: f64 = 2.0;
/// A sample only counts when its outward part beats its along-the-edge part by this much.
const PERPENDICULAR_RATIO: f64 = 1.2;

#[derive(Debug, Default)]
pub struct GestureDetector {
    contact: Option<(DisplayId, Edge)>,
    samples: VecDeque<(f64, f64)>,
    last_trigger: Option<f64>,
}

impl GestureDetector {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn reset(&mut self) {
        self.contact = None;
        self.samples.clear();
    }

    /// Feed one motion sample. Returns a push when the threshold is crossed.
    pub fn on_motion(&mut self, m: &Motion, displays: &[Display], cfg: &Config) -> Option<Push> {
        // G9: nothing to arrange with a single display
        if displays.len() < 2 || !cfg.enabled {
            self.reset();
            return None;
        }
        // G7 / G8
        if m.buttons || (cfg.ignore_fullscreen && m.fullscreen) {
            self.reset();
            return None;
        }
        // G6: cooldown after a flip
        if let Some(last) = self.last_trigger {
            if m.t - last < cfg.cooldown_secs {
                self.reset();
                return None;
            }
        }
        let Some(d) = displays.iter().find(|d| d.bounds.contains(m.pos)) else {
            self.reset();
            return None;
        };
        // which edge is the cursor pressed against, and how hard (outward component)
        let Some((edge, outward)) = pressed_edge(&d.bounds, m) else {
            self.reset(); // G3: left the edge
            return None;
        };
        // G4: corners are for Hot Corners, the Start menu, close buttons...
        if in_corner(&d.bounds, edge, m.pos, cfg.corner * d.scale) {
            self.reset();
            return None;
        }
        // G5: a display already continues beyond this point, the OS will let the cursor through
        if has_neighbour(displays, d, edge, m.pos) {
            self.reset();
            return None;
        }
        // G3: changed edge or display
        if self.contact != Some((d.id, edge)) {
            self.samples.clear();
            self.contact = Some((d.id, edge));
        }
        // A deliberate push is mostly perpendicular to the edge. Sliding along it (say, on the
        // way to a Hot Corner or a close button) mustn't add up to a flip.
        let along_edge = if edge.is_vertical() { m.dy.abs() } else { m.dx.abs() };
        if outward < PERPENDICULAR_RATIO * along_edge {
            return None;
        }
        self.samples.push_back((m.t, outward));
        while let Some(&(t0, _)) = self.samples.front() {
            if m.t - t0 > cfg.window_secs {
                self.samples.pop_front();
            } else {
                break;
            }
        }
        let total: f64 = self.samples.iter().map(|&(_, a)| a).sum();
        if total >= cfg.sensitivity.threshold() * d.scale {
            self.last_trigger = Some(m.t);
            self.reset();
            return Some(Push { display: d.id, edge, at: m.pos });
        }
        None
    }
}

fn pressed_edge(r: &Rect, m: &Motion) -> Option<(Edge, f64)> {
    let mut best: Option<(Edge, f64)> = None;
    let mut consider = |edge: Edge, at_edge: bool, amount: f64| {
        if at_edge && amount > 0.0 && best.is_none_or(|(_, a)| amount > a) {
            best = Some((edge, amount));
        }
    };
    consider(Edge::Right, m.pos.x >= r.right() - EDGE_TOLERANCE, m.dx);
    consider(Edge::Left, m.pos.x <= r.left() + EDGE_TOLERANCE, -m.dx);
    consider(Edge::Bottom, m.pos.y >= r.bottom() - EDGE_TOLERANCE, m.dy);
    consider(Edge::Top, m.pos.y <= r.top() + EDGE_TOLERANCE, -m.dy);
    best
}

fn in_corner(r: &Rect, edge: Edge, p: Point, corner: f64) -> bool {
    if edge.is_vertical() {
        p.y - r.top() < corner || r.bottom() - p.y < corner
    } else {
        p.x - r.left() < corner || r.right() - p.x < corner
    }
}

/// Is there another display touching `edge` of `d` at the cursor's position along that edge?
fn has_neighbour(displays: &[Display], d: &Display, edge: Edge, p: Point) -> bool {
    let b = &d.bounds;
    displays.iter().filter(|o| o.id != d.id).any(|o| {
        let r = &o.bounds;
        match edge {
            Edge::Right => (r.left() - b.right()).abs() <= EDGE_TOLERANCE && p.y >= r.top() && p.y <= r.bottom(),
            Edge::Left => (b.left() - r.right()).abs() <= EDGE_TOLERANCE && p.y >= r.top() && p.y <= r.bottom(),
            Edge::Bottom => (r.top() - b.bottom()).abs() <= EDGE_TOLERANCE && p.x >= r.left() && p.x <= r.right(),
            Edge::Top => (b.top() - r.bottom()).abs() <= EDGE_TOLERANCE && p.x >= r.left() && p.x <= r.right(),
        }
    })
}
