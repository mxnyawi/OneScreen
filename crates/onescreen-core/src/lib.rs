//! OneScreen core: gesture detection, display arrangement and per-desk memory.
//!
//! No OS calls live here. The platform shells (`crates/onescreen/src/platform`)
//! turn input and display changes into [`Event`]s and carry out [`Action`]s.

pub mod arrange;
pub mod config;
pub mod display;
pub mod edid;
pub mod engine;
pub mod geometry;
pub mod gesture;
pub mod memory;

pub use config::{Config, Sensitivity};
pub use display::{Display, DisplayId};
pub use engine::{Action, Engine, Event, State};
pub use geometry::{Edge, Point, Rect};
pub use gesture::Motion;
