use serde::{Deserialize, Serialize};

use crate::geometry::Rect;

/// Platform handle for a display (CGDirectDisplayID on macOS, an index into the shell's path table on Windows).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
pub struct DisplayId(pub u32);

#[derive(Clone, Debug, PartialEq)]
pub struct Display {
    pub id: DisplayId,
    /// Identity that survives reconnects (EDID vendor/product/serial, falling back to the connector path).
    pub key: String,
    pub bounds: Rect,
    /// The primary display is pinned at (0, 0) by both operating systems.
    pub primary: bool,
    /// Units per point (DPI scale on Windows, 1.0 on macOS). Thresholds are multiplied by this.
    pub scale: f64,
}

/// Make keys unique when identical monitors report the same identity (PRD M6):
/// duplicates get `#2`, `#3`… in id order, which follows the connector order.
pub fn disambiguate_keys(displays: &mut [Display]) {
    let mut order: Vec<usize> = (0..displays.len()).collect();
    order.sort_by_key(|&i| displays[i].id);
    let mut seen: std::collections::HashMap<String, u32> = Default::default();
    for i in order {
        let n = seen.entry(displays[i].key.clone()).or_insert(0);
        *n += 1;
        if *n > 1 {
            displays[i].key = format!("{}#{}", displays[i].key, n);
        }
    }
}
