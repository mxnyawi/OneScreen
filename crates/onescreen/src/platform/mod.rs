//! The OS layer. Each platform turns raw input and display changes into
//! [`crate::app::AppEvent`]s and carries out what the core asks for.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use onescreen_core::{Display, DisplayId, Edge, Point};

#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "macos")]
pub use macos::start;

#[cfg(windows)]
mod windows;
#[cfg(windows)]
pub use self::windows::start;

/// What the app needs from the operating system.
pub trait Platform {
    /// Active displays and whether any are mirrored.
    fn displays(&mut self) -> (Vec<Display>, bool);
    fn cursor(&self) -> Point;
    fn buttons_down(&self) -> bool;
    /// A full-screen game or presentation is in front (best effort; `false` if unknown).
    fn fullscreen_app(&mut self) -> bool;
    /// Move displays to these origins through the official display settings API.
    fn apply(&mut self, origins: &[(DisplayId, Point)]) -> Result<(), String>;
    fn warp(&self, p: Point);
    fn beep(&self);
    /// Show the edge glow. The app drives the fade with [`Platform::set_glow_alpha`].
    fn show_glow(&mut self, display: &Display, edge: Edge, along: f64);
    /// 0.0 hides it.
    fn set_glow_alpha(&mut self, alpha: f64);
    /// The OS asks for reduced motion: skip the glow.
    fn reduce_motion(&self) -> bool;
    fn set_launch_at_login(&self, on: bool) -> Result<(), String>;
}

/// Mouse deltas from the input callback, coalesced so the main loop gets at most
/// one wake-up per batch instead of one per hardware report.
#[derive(Default)]
pub struct Deltas {
    sum: Mutex<(f64, f64)>,
    queued: AtomicBool,
}

impl Deltas {
    /// Add a movement. Returns true if the caller should wake the main loop.
    pub fn add(&self, dx: f64, dy: f64) -> bool {
        if let Ok(mut s) = self.sum.lock() {
            s.0 += dx;
            s.1 += dy;
        }
        !self.queued.swap(true, Ordering::AcqRel)
    }
    pub fn take(&self) -> (f64, f64) {
        self.queued.store(false, Ordering::Release);
        self.sum.lock().map(|mut s| std::mem::take(&mut *s)).unwrap_or((0.0, 0.0))
    }
}

/// The glow's fade (PRD A6): ~150 ms in, a short hold, ~700 ms out.
pub struct GlowFade {
    started: Instant,
}

impl GlowFade {
    const IN: f64 = 0.15;
    const HOLD: f64 = 0.12;
    const OUT: f64 = 0.70;

    pub fn new() -> Self {
        Self { started: Instant::now() }
    }
    /// Current alpha, or `None` when finished.
    pub fn alpha(&self, now: Instant) -> Option<f64> {
        let t = now.saturating_duration_since(self.started).as_secs_f64();
        if t < Self::IN {
            Some(t / Self::IN)
        } else if t < Self::IN + Self::HOLD {
            Some(1.0)
        } else if t < Self::IN + Self::HOLD + Self::OUT {
            let p = (t - Self::IN - Self::HOLD) / Self::OUT;
            Some((1.0 - p) * (1.0 - p))
        } else {
            None
        }
    }
    pub const FRAME: Duration = Duration::from_millis(16);
}

/// The glow strip for an edge: a band along the whole edge, `depth` units deep.
pub fn glow_rect(d: &Display, edge: Edge, depth: f64) -> onescreen_core::Rect {
    let b = d.bounds;
    match edge {
        Edge::Left => onescreen_core::Rect::new(b.left(), b.top(), depth, b.h),
        Edge::Right => onescreen_core::Rect::new(b.right() - depth, b.top(), depth, b.h),
        Edge::Top => onescreen_core::Rect::new(b.left(), b.top(), b.w, depth),
        Edge::Bottom => onescreen_core::Rect::new(b.left(), b.bottom() - depth, b.w, depth),
    }
}

/// The accent colour, linear 0..1 RGB.
pub const ACCENT: (f64, f64, f64) = (198.0 / 255.0, 1.0, 74.0 / 255.0);
