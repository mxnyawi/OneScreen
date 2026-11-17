//! Per-desk layout memory (PRD §7.3).
//!
//! A desk is the set of connected displays. For each desk we keep every display's
//! origin relative to the primary, and restore it when that set shows up again.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use crate::display::{Display, DisplayId};
use crate::geometry::{Edge, Point};

/// M2: a desk is identified by the sorted set of display keys.
pub fn desk_id(displays: &[Display]) -> String {
    let mut keys: Vec<&str> = displays.iter().map(|d| d.key.as_str()).collect();
    keys.sort_unstable();
    keys.join(" | ")
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct DeskLayout {
    /// Key of the primary display when this was saved.
    pub primary: String,
    /// M3: origin of every display relative to the primary's origin.
    pub offsets: BTreeMap<String, (i64, i64)>,
}

impl DeskLayout {
    pub fn capture(displays: &[Display]) -> Option<Self> {
        let p = displays.iter().find(|d| d.primary)?;
        let offsets = displays
            .iter()
            .map(|d| {
                (d.key.clone(), ((d.bounds.x - p.bounds.x).round() as i64, (d.bounds.y - p.bounds.y).round() as i64))
            })
            .collect();
        Some(Self { primary: p.key.clone(), offsets })
    }

    /// Origins that would restore this layout, or `None` if it already matches or can't apply.
    pub fn restore_plan(&self, displays: &[Display]) -> Option<Vec<(DisplayId, Point)>> {
        let p = displays.iter().find(|d| d.primary)?;
        if p.key != self.primary {
            return None; // the user picked a different main display since; respect it
        }
        let mut changes = Vec::new();
        for d in displays {
            let &(ox, oy) = self.offsets.get(&d.key)?;
            let want = Point::new(p.bounds.x + ox as f64, p.bounds.y + oy as f64);
            if (want.x - d.bounds.x).abs() > 0.5 || (want.y - d.bounds.y).abs() > 0.5 {
                changes.push((d.id, want));
            }
        }
        (!changes.is_empty()).then_some(changes)
    }
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct Memory {
    pub desks: BTreeMap<String, DeskLayout>,
}

impl Memory {
    pub fn get(&self, desk: &str) -> Option<&DeskLayout> {
        self.desks.get(desk)
    }
    /// Returns true if something changed.
    pub fn remember(&mut self, displays: &[Display]) -> bool {
        let Some(layout) = DeskLayout::capture(displays) else {
            return false;
        };
        let id = desk_id(displays);
        if self.desks.get(&id) == Some(&layout) {
            return false;
        }
        self.desks.insert(id, layout);
        true
    }
    /// M7
    pub fn forget_all(&mut self) {
        self.desks.clear();
    }
}

/// The edge of `other` that faces the primary, used for the "restored" glow (PRD §6.2).
pub fn facing_edge(displays: &[Display], other: DisplayId) -> Option<Edge> {
    let p = displays.iter().find(|d| d.primary)?;
    let o = displays.iter().find(|d| d.id == other)?;
    let (pc, oc) = (p.bounds.center(), o.bounds.center());
    let (dx, dy) = (oc.x - pc.x, oc.y - pc.y);
    Some(if dx.abs() >= dy.abs() {
        if dx > 0.0 {
            Edge::Left
        } else {
            Edge::Right
        }
    } else if dy > 0.0 {
        Edge::Top
    } else {
        Edge::Bottom
    })
}
