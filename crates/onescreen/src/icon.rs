//! The tray / menu bar icon, drawn in code: two screens side by side with a bar
//! between them (the edge that opens). Monochrome template on macOS so it follows
//! the menu bar's light/dark appearance.

use tray_icon::Icon;

const SIZE: u32 = 36;

pub fn tray_icon() -> Icon {
    // macOS: black template (tinted by the system). Windows: the accent, readable on light and dark taskbars.
    let (fill, alpha_scale) = if cfg!(target_os = "macos") { ([0u8, 0, 0], 1.0) } else { ([198u8, 255, 74], 1.0) };
    let mut rgba = vec![0u8; (SIZE * SIZE * 4) as usize];
    let mut put = |x: i32, y: i32, a: f32| {
        if x < 0 || y < 0 || x >= SIZE as i32 || y >= SIZE as i32 {
            return;
        }
        let i = ((y as u32 * SIZE + x as u32) * 4) as usize;
        let a = (a * alpha_scale * 255.0).round().clamp(0.0, 255.0) as u8;
        if a >= rgba[i + 3] {
            rgba[i..i + 4].copy_from_slice(&[fill[0], fill[1], fill[2], a]);
        }
    };
    // rounded-rect outline helper (2 px stroke)
    let mut outline = |x0: i32, y0: i32, x1: i32, y1: i32| {
        for y in y0..=y1 {
            for x in x0..=x1 {
                let edge = x - x0 < 3 || x1 - x < 3 || y - y0 < 3 || y1 - y < 3;
                let corner = (x - x0 < 2 || x1 - x < 2) && (y - y0 < 2 || y1 - y < 2);
                if edge && !corner {
                    put(x, y, 1.0);
                }
            }
        }
    };
    outline(1, 9, 15, 26); // laptop screen
    outline(20, 5, 34, 30); // monitor
                            // the opened edge
    for y in 3..33 {
        for x in 17..19 {
            put(x, y, 1.0);
        }
    }
    Icon::from_rgba(rgba, SIZE, SIZE).expect("valid icon")
}
