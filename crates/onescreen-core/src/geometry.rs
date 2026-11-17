//! Global desktop coordinates: origin at the top-left of the primary display, y grows downwards.
//! macOS reports points, Windows physical pixels; the core works in whatever the platform gives it.

use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

impl Point {
    pub const fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct Rect {
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
}

impl Rect {
    pub const fn new(x: f64, y: f64, w: f64, h: f64) -> Self {
        Self { x, y, w, h }
    }
    pub fn left(&self) -> f64 {
        self.x
    }
    pub fn right(&self) -> f64 {
        self.x + self.w
    }
    pub fn top(&self) -> f64 {
        self.y
    }
    pub fn bottom(&self) -> f64 {
        self.y + self.h
    }
    pub fn center(&self) -> Point {
        Point::new(self.x + self.w / 2.0, self.y + self.h / 2.0)
    }
    /// Inclusive of the right/bottom edge, so a cursor pinned at the last pixel still counts.
    pub fn contains(&self, p: Point) -> bool {
        p.x >= self.left() && p.x <= self.right() && p.y >= self.top() && p.y <= self.bottom()
    }
    /// Strict overlap (touching edges do not count).
    pub fn overlaps(&self, o: &Rect) -> bool {
        self.left() < o.right() && o.left() < self.right() && self.top() < o.bottom() && o.top() < self.bottom()
    }
    pub fn with_origin(&self, p: Point) -> Rect {
        Rect::new(p.x, p.y, self.w, self.h)
    }
    pub fn origin(&self) -> Point {
        Point::new(self.x, self.y)
    }
}

/// A side of a display.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Edge {
    Left,
    Right,
    Top,
    Bottom,
}

impl Edge {
    pub fn opposite(self) -> Edge {
        match self {
            Edge::Left => Edge::Right,
            Edge::Right => Edge::Left,
            Edge::Top => Edge::Bottom,
            Edge::Bottom => Edge::Top,
        }
    }
    /// True for Left/Right (the edge is a vertical line).
    pub fn is_vertical(self) -> bool {
        matches!(self, Edge::Left | Edge::Right)
    }
}

/// Place a rect of `size` against `edge` of `anchor`, centred along that edge.
pub fn place_beside(anchor: &Rect, w: f64, h: f64, edge: Edge) -> Rect {
    let c = anchor.center();
    match edge {
        Edge::Right => Rect::new(anchor.right(), c.y - h / 2.0, w, h),
        Edge::Left => Rect::new(anchor.left() - w, c.y - h / 2.0, w, h),
        Edge::Bottom => Rect::new(c.x - w / 2.0, anchor.bottom(), w, h),
        Edge::Top => Rect::new(c.x - w / 2.0, anchor.top() - h, w, h),
    }
}

/// Relative position (0..1) of `p` along `edge` of `r`.
pub fn along(r: &Rect, edge: Edge, p: Point) -> f64 {
    let v = if edge.is_vertical() { (p.y - r.top()) / r.h } else { (p.x - r.left()) / r.w };
    v.clamp(0.0, 1.0)
}

/// The point just inside `edge` of `r` at relative position `t` along it.
pub fn point_on_edge(r: &Rect, edge: Edge, t: f64, inset: f64) -> Point {
    let t = t.clamp(0.0, 1.0);
    match edge {
        Edge::Left => Point::new(r.left() + inset, r.top() + t * r.h),
        Edge::Right => Point::new(r.right() - inset, r.top() + t * r.h),
        Edge::Top => Point::new(r.left() + t * r.w, r.top() + inset),
        Edge::Bottom => Point::new(r.left() + t * r.w, r.bottom() - inset),
    }
}
