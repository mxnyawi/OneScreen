//! Turn a push into a new layout (PRD §7.2).

use crate::display::{Display, DisplayId};
use crate::geometry::{along, place_beside, point_on_edge, Edge, Point, Rect};
use crate::gesture::Push;

/// Where the cursor should land after the change, expressed relative to a display
/// so it can be recomputed from the layout the OS actually applied.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Landing {
    pub display: DisplayId,
    /// The edge the cursor enters through.
    pub edge: Edge,
    /// Relative position along that edge (0..1), matching where it left the source.
    pub along: f64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct Plan {
    /// New origins for the displays that move.
    pub origins: Vec<(DisplayId, Point)>,
    pub landing: Landing,
}

/// A1–A3: move the other display to the side the user pushed toward, centred on that edge.
/// If that display is the primary (pinned at 0,0), move the source display to the opposite side instead.
pub fn plan_flip(displays: &[Display], push: &Push) -> Option<Plan> {
    let src = displays.iter().find(|d| d.id == push.display)?;
    let others: Vec<&Display> = displays.iter().filter(|d| d.id != src.id).collect();
    // A2: with 3+ displays, take the one furthest from the push direction
    let target = *others.iter().min_by(|a, b| {
        let ka = away_score(&a.bounds, push.edge);
        let kb = away_score(&b.bounds, push.edge);
        ka.partial_cmp(&kb).unwrap_or(std::cmp::Ordering::Equal)
    })?;
    let rel = along(&src.bounds, push.edge, push.at);

    let (moved_id, mut rect) = if !target.primary {
        (target.id, place_beside(&src.bounds, target.bounds.w, target.bounds.h, push.edge))
    } else {
        // A3: the primary can't move, so move the source to the far side of it
        (src.id, place_beside(&target.bounds, src.bounds.w, src.bounds.h, push.edge.opposite()))
    };
    // keep clear of any third display
    let fixed: Vec<Rect> = displays.iter().filter(|d| d.id != moved_id).map(|d| d.bounds).collect();
    for _ in 0..16 {
        let Some(hit) = fixed.iter().find(|f| f.overlaps(&rect)) else {
            break;
        };
        rect = nudge_out(rect, hit, push.edge, moved_id == src.id);
    }
    let rect = rect.with_origin(Point::new(rect.x.round(), rect.y.round()));
    Some(Plan {
        origins: vec![(moved_id, rect.origin())],
        landing: Landing { display: target.id, edge: push.edge.opposite(), along: rel },
    })
}

/// Lower = further from the push direction.
fn away_score(r: &Rect, edge: Edge) -> f64 {
    let c = r.center();
    match edge {
        Edge::Right => c.x,
        Edge::Left => -c.x,
        Edge::Bottom => c.y,
        Edge::Top => -c.y,
    }
}

fn nudge_out(r: Rect, hit: &Rect, edge: Edge, moving_source: bool) -> Rect {
    // move further along the push axis, in the direction the moved display is travelling
    let dir = if moving_source { edge.opposite() } else { edge };
    match dir {
        Edge::Right => r.with_origin(Point::new(hit.right(), r.y)),
        Edge::Left => r.with_origin(Point::new(hit.left() - r.w, r.y)),
        Edge::Bottom => r.with_origin(Point::new(r.x, hit.bottom())),
        Edge::Top => r.with_origin(Point::new(r.x, hit.top() - r.h)),
    }
}

/// A5: the point on the landing display matching where the cursor left (2 units inside the edge).
pub fn landing_point(displays: &[Display], l: &Landing) -> Option<Point> {
    let d = displays.iter().find(|d| d.id == l.display)?;
    Some(point_on_edge(&d.bounds, l.edge, l.along, 2.0))
}
