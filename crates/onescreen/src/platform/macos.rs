//! macOS layer (PRD §9.1): NSEvent global monitor for raw movement, CoreGraphics
//! for displays, layout changes, cursor warps and reconfiguration events, a
//! borderless click-through NSWindow for the glow, a LaunchAgent for login.
//!
//! Coordinates are CoreGraphics global points: origin at the top-left of the main
//! display, y downwards, which is what the core uses.

use std::ffi::c_void;
use std::ptr::{null, null_mut};
use std::sync::Arc;

use block2::RcBlock;
use objc2::rc::Retained;
use objc2::runtime::AnyObject;
use objc2::{class, msg_send};
use objc2_foundation::{NSPoint, NSRect, NSSize};
use onescreen_core::{Display, DisplayId, Edge, Point};

use super::{glow_rect, Deltas, Platform, ACCENT};
use crate::app::{AppEvent, Proxy};

// ------------------------------------------------------------------ CoreGraphics FFI

type CGDirectDisplayID = u32;
type CGDisplayConfigRef = *mut c_void;
type CGError = i32;

#[repr(C)]
#[derive(Clone, Copy, Debug)]
struct CGPoint {
    x: f64,
    y: f64,
}
#[repr(C)]
#[derive(Clone, Copy, Debug)]
struct CGSize {
    width: f64,
    height: f64,
}
#[repr(C)]
#[derive(Clone, Copy, Debug)]
struct CGRect {
    origin: CGPoint,
    size: CGSize,
}

const K_CG_CONFIGURE_PERMANENTLY: u32 = 2;
const K_CG_DISPLAY_BEGIN_CONFIGURATION_FLAG: u32 = 1;
const K_CG_EVENT_SOURCE_STATE_COMBINED: i32 = 0;

#[link(name = "CoreGraphics", kind = "framework")]
extern "C" {
    fn CGGetActiveDisplayList(max: u32, displays: *mut CGDirectDisplayID, count: *mut u32) -> CGError;
    fn CGDisplayBounds(display: CGDirectDisplayID) -> CGRect;
    fn CGMainDisplayID() -> CGDirectDisplayID;
    fn CGDisplayIsInMirrorSet(display: CGDirectDisplayID) -> u32;
    fn CGDisplayVendorNumber(display: CGDirectDisplayID) -> u32;
    fn CGDisplayModelNumber(display: CGDirectDisplayID) -> u32;
    fn CGDisplaySerialNumber(display: CGDirectDisplayID) -> u32;
    fn CGDisplayIsBuiltin(display: CGDirectDisplayID) -> u32;
    fn CGDisplayUnitNumber(display: CGDirectDisplayID) -> u32;
    fn CGBeginDisplayConfiguration(config: *mut CGDisplayConfigRef) -> CGError;
    fn CGConfigureDisplayOrigin(config: CGDisplayConfigRef, display: CGDirectDisplayID, x: i32, y: i32) -> CGError;
    fn CGCompleteDisplayConfiguration(config: CGDisplayConfigRef, option: u32) -> CGError;
    fn CGCancelDisplayConfiguration(config: CGDisplayConfigRef) -> CGError;
    fn CGWarpMouseCursorPosition(point: CGPoint) -> CGError;
    fn CGAssociateMouseAndMouseCursorPosition(connected: u32) -> CGError;
    fn CGDisplayRegisterReconfigurationCallback(
        callback: extern "C" fn(CGDirectDisplayID, u32, *mut c_void),
        user_info: *mut c_void,
    ) -> CGError;
    fn CGEventCreate(source: *const c_void) -> *mut c_void;
    fn CGEventGetLocation(event: *mut c_void) -> CGPoint;
    fn CGEventSourceButtonState(state: i32, button: u32) -> bool;
    /// Returns a CGColorRef (a CF object, usable wherever Objective-C expects `id`).
    fn CGColorCreateSRGB(r: f64, g: f64, b: f64, a: f64) -> *mut AnyObject;
}

#[link(name = "CoreFoundation", kind = "framework")]
extern "C" {
    fn CFRelease(cf: *const c_void);
}

#[link(name = "AppKit", kind = "framework")]
extern "C" {
    fn NSBeep();
}

// NSEventMask bits for mouse movement (NSEventTypeMouseMoved = 5, *Dragged = 6, 7, 27)
const MOUSE_MOVED_MASK: u64 = (1 << 5) | (1 << 6) | (1 << 7) | (1 << 27);

// ------------------------------------------------------------------ platform

pub struct MacOs {
    glow: Option<Retained<AnyObject>>,
    _monitor: Option<Retained<AnyObject>>,
}

pub fn start(proxy: Proxy) -> (Box<dyn Platform>, Arc<Deltas>) {
    let deltas = Arc::new(Deltas::default());

    // G1: a global monitor keeps reporting deltaX/deltaY while the cursor is pinned at an edge.
    let monitor = {
        let deltas = deltas.clone();
        let proxy = proxy.clone();
        let block = RcBlock::new(move |event: *mut AnyObject| {
            if event.is_null() {
                return;
            }
            let (dx, dy): (f64, f64) = unsafe { (msg_send![event, deltaX], msg_send![event, deltaY]) };
            if deltas.add(dx, dy) {
                let _ = proxy.send_event(AppEvent::Motion);
            }
        });
        let m: Option<Retained<AnyObject>> = unsafe {
            msg_send![class!(NSEvent), addGlobalMonitorForEventsMatchingMask: MOUSE_MOVED_MASK, handler: &*block]
        };
        m
    };

    // display changes; the proxy lives for the whole process
    let user = Box::into_raw(Box::new(proxy)) as *mut c_void;
    unsafe {
        CGDisplayRegisterReconfigurationCallback(on_reconfigure, user);
    }

    (Box::new(MacOs { glow: None, _monitor: monitor }), deltas)
}

extern "C" fn on_reconfigure(_display: CGDirectDisplayID, flags: u32, user: *mut c_void) {
    if flags & K_CG_DISPLAY_BEGIN_CONFIGURATION_FLAG != 0 {
        return; // wait for the end of the change
    }
    let proxy = unsafe { &*(user as *const Proxy) };
    let _ = proxy.send_event(AppEvent::DisplaysChanged);
}

fn to_rect(r: CGRect) -> onescreen_core::Rect {
    onescreen_core::Rect::new(r.origin.x, r.origin.y, r.size.width, r.size.height)
}

/// M1: vendor/model/serial; displays without a serial fall back to the connector (unit number).
fn display_key(id: CGDirectDisplayID) -> String {
    unsafe {
        if CGDisplayIsBuiltin(id) != 0 {
            return "builtin".into();
        }
        let (v, m, s) = (CGDisplayVendorNumber(id), CGDisplayModelNumber(id), CGDisplaySerialNumber(id));
        if s != 0 {
            format!("{v:04x}-{m:04x}-{s:x}")
        } else {
            format!("{v:04x}-{m:04x}-unit{}", CGDisplayUnitNumber(id))
        }
    }
}

impl Platform for MacOs {
    fn displays(&mut self) -> (Vec<Display>, bool) {
        let mut ids = [0u32; 32];
        let mut n = 0u32;
        if unsafe { CGGetActiveDisplayList(ids.len() as u32, ids.as_mut_ptr(), &mut n) } != 0 {
            return (vec![], false);
        }
        let main = unsafe { CGMainDisplayID() };
        let mut mirrored = false;
        let displays = ids[..n as usize]
            .iter()
            .map(|&id| {
                mirrored |= unsafe { CGDisplayIsInMirrorSet(id) } != 0;
                Display {
                    id: DisplayId(id),
                    key: display_key(id),
                    bounds: to_rect(unsafe { CGDisplayBounds(id) }),
                    primary: id == main,
                    scale: 1.0,
                }
            })
            .collect();
        (displays, mirrored)
    }

    fn cursor(&self) -> Point {
        unsafe {
            let e = CGEventCreate(null());
            if e.is_null() {
                return Point::new(0.0, 0.0);
            }
            let p = CGEventGetLocation(e);
            CFRelease(e as *const c_void);
            Point::new(p.x, p.y)
        }
    }

    fn buttons_down(&self) -> bool {
        unsafe { (0..3).any(|b| CGEventSourceButtonState(K_CG_EVENT_SOURCE_STATE_COMBINED, b)) }
    }

    fn fullscreen_app(&mut self) -> bool {
        false // not detected on macOS yet (PRD G8 is optional)
    }

    fn apply(&mut self, origins: &[(DisplayId, Point)]) -> Result<(), String> {
        unsafe {
            let mut config: CGDisplayConfigRef = null_mut();
            if CGBeginDisplayConfiguration(&mut config) != 0 {
                return Err("CGBeginDisplayConfiguration failed".into());
            }
            for (id, p) in origins {
                if CGConfigureDisplayOrigin(config, id.0, p.x.round() as i32, p.y.round() as i32) != 0 {
                    CGCancelDisplayConfiguration(config);
                    return Err(format!("CGConfigureDisplayOrigin failed for display {}", id.0));
                }
            }
            // .permanently: persists like a change made in System Settings (PRD A4)
            match CGCompleteDisplayConfiguration(config, K_CG_CONFIGURE_PERMANENTLY) {
                0 => Ok(()),
                e => Err(format!("CGCompleteDisplayConfiguration failed ({e})")),
            }
        }
    }

    fn warp(&self, p: Point) {
        unsafe {
            CGWarpMouseCursorPosition(CGPoint { x: p.x, y: p.y });
            // without this the cursor freezes for a moment after a warp
            CGAssociateMouseAndMouseCursorPosition(1);
        }
    }

    fn beep(&self) {
        unsafe { NSBeep() }
    }

    fn show_glow(&mut self, d: &Display, edge: Edge, _along: f64) {
        let r = glow_rect(d, edge, 90.0);
        // Cocoa windows use bottom-left origin coordinates of the main display
        let main_h = unsafe { CGDisplayBounds(CGMainDisplayID()).size.height };
        let frame = NSRect::new(NSPoint::new(r.x, main_h - (r.y + r.h)), NSSize::new(r.w, r.h));
        unsafe {
            if let Some(old) = self.glow.take() {
                let _: () = msg_send![&*old, orderOut: null::<AnyObject>()];
            }
            let window: Option<Retained<AnyObject>> = msg_send![
                msg_send![class!(NSWindow), alloc],
                initWithContentRect: frame,
                styleMask: 0usize,  // borderless
                backing: 2usize,    // buffered
                defer: false
            ];
            let Some(window) = window else { return };
            let clear: *mut AnyObject = msg_send![class!(NSColor), clearColor];
            let _: () = msg_send![&*window, setReleasedWhenClosed: false];
            let _: () = msg_send![&*window, setOpaque: false];
            let _: () = msg_send![&*window, setBackgroundColor: clear];
            let _: () = msg_send![&*window, setHasShadow: false];
            let _: () = msg_send![&*window, setIgnoresMouseEvents: true]; // never blocks clicks (A6)
            let _: () = msg_send![&*window, setLevel: 1000isize]; // NSScreenSaverWindowLevel
                                                                  // all Spaces, stationary, not in Cmd-Tab, allowed over full-screen apps
            let _: () = msg_send![&*window, setCollectionBehavior: (1usize << 0) | (1 << 4) | (1 << 6) | (1 << 8)];
            let _: () = msg_send![&*window, setAlphaValue: 0.0f64];

            // a gradient from the accent at the edge to transparent
            let view: *mut AnyObject = msg_send![&*window, contentView];
            let _: () = msg_send![view, setWantsLayer: true];
            let layer: *mut AnyObject = msg_send![view, layer];
            let gradient: *mut AnyObject = msg_send![class!(CAGradientLayer), layer];
            let (r0, g0, b0) = ACCENT;
            let strong = CGColorCreateSRGB(r0, g0, b0, 0.85);
            let clear_c = CGColorCreateSRGB(r0, g0, b0, 0.0);
            let colors: [*mut AnyObject; 2] = [strong, clear_c];
            let array: *mut AnyObject = msg_send![class!(NSArray), arrayWithObjects: colors.as_ptr(), count: 2usize];
            let _: () = msg_send![gradient, setColors: array];
            let (start, end) = match edge {
                Edge::Left => (NSPoint::new(0.0, 0.5), NSPoint::new(1.0, 0.5)),
                Edge::Right => (NSPoint::new(1.0, 0.5), NSPoint::new(0.0, 0.5)),
                // layer y is flipped relative to the screen: top edge is y = 1
                Edge::Top => (NSPoint::new(0.5, 1.0), NSPoint::new(0.5, 0.0)),
                Edge::Bottom => (NSPoint::new(0.5, 0.0), NSPoint::new(0.5, 1.0)),
            };
            let _: () = msg_send![gradient, setStartPoint: start];
            let _: () = msg_send![gradient, setEndPoint: end];
            let bounds: NSRect = msg_send![view, bounds];
            let _: () = msg_send![gradient, setFrame: bounds];
            let _: () = msg_send![layer, addSublayer: gradient];
            CFRelease(strong as *const c_void);
            CFRelease(clear_c as *const c_void);

            let _: () = msg_send![&*window, orderFrontRegardless];
            self.glow = Some(window);
        }
    }

    fn set_glow_alpha(&mut self, alpha: f64) {
        let Some(w) = &self.glow else { return };
        unsafe {
            if alpha <= 0.0 {
                let _: () = msg_send![&**w, orderOut: null::<AnyObject>()];
                self.glow = None;
            } else {
                let _: () = msg_send![&**w, setAlphaValue: alpha];
            }
        }
    }

    fn reduce_motion(&self) -> bool {
        unsafe {
            let ws: *mut AnyObject = msg_send![class!(NSWorkspace), sharedWorkspace];
            msg_send![ws, accessibilityDisplayShouldReduceMotion]
        }
    }

    /// A per-user LaunchAgent: works for the .app bundle and for a bare binary alike.
    fn set_launch_at_login(&self, on: bool) -> Result<(), String> {
        let home = dirs::home_dir().ok_or("no home directory")?;
        let agent = home.join("Library/LaunchAgents/io.github.mxnyawi.onescreen.plist");
        if !on {
            let _ = std::fs::remove_file(&agent);
            return Ok(());
        }
        let exe = std::env::current_exe().map_err(|e| e.to_string())?;
        let plist = format!(
            r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>io.github.mxnyawi.onescreen</string>
  <key>ProgramArguments</key><array><string>{}</string></array>
  <key>RunAtLoad</key><true/>
  <key>ProcessType</key><string>Interactive</string>
</dict>
</plist>
"#,
            xml_escape(&exe.to_string_lossy())
        );
        if let Some(dir) = agent.parent() {
            std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
        }
        std::fs::write(&agent, plist).map_err(|e| e.to_string())
    }
}

fn xml_escape(s: &str) -> String {
    s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;")
}
