//! Windows layer (PRD §9.2): Raw Input for movement (it keeps reporting while the
//! cursor is pinned at an edge), QueryDisplayConfig / SetDisplayConfig for the
//! layout, a layered click-through window for the glow, the Run key for login.
//!
//! Coordinates are virtual-screen physical pixels (the process is Per-Monitor DPI
//! Aware v2), primary display at (0, 0).

use std::cell::RefCell;
use std::ffi::c_void;
use std::mem::size_of;
use std::ptr::null_mut;
use std::sync::{Arc, Once};

use onescreen_core::{Display, DisplayId, Edge, Point, Rect};
use windows::core::{w, BOOL, PCWSTR};
use windows::Win32::Devices::Display::*;
use windows::Win32::Foundation::*;
use windows::Win32::Graphics::Gdi::*;
use windows::Win32::System::Diagnostics::Debug::MessageBeep;
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::HiDpi::*;
use windows::Win32::UI::Input::KeyboardAndMouse::*;
use windows::Win32::UI::Input::*;
use windows::Win32::UI::Shell::*;
use windows::Win32::UI::WindowsAndMessaging::*;

use super::{glow_rect, Deltas, Platform, ACCENT};
use crate::app::{AppEvent, Proxy};

/// A display's source in the display configuration: (adapter LUID, source id).
#[derive(Clone, Copy, PartialEq, Eq)]
struct SourceKey(u32, i32, u32);

struct Glow {
    hwnd: HWND,
    mem: HDC,
    bitmap: HBITMAP,
    pos: POINT,
    size: SIZE,
}

pub struct WindowsPlatform {
    /// DisplayId(n) is index n here, so ids stay stable while the session lasts.
    sources: Vec<SourceKey>,
    glow: Option<Glow>,
}

thread_local! {
    static INPUT: RefCell<Option<(Proxy, Arc<Deltas>)>> = const { RefCell::new(None) };
}

pub fn start(proxy: Proxy) -> (Box<dyn Platform>, Arc<Deltas>) {
    unsafe {
        // tao already does this; harmless if it's set
        let _ = SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);
    }
    let deltas = Arc::new(Deltas::default());
    {
        let deltas = deltas.clone();
        std::thread::Builder::new()
            .name("onescreen-input".into())
            .spawn(move || input_thread(proxy, deltas))
            .expect("input thread");
    }
    (Box::new(WindowsPlatform { sources: Vec::new(), glow: None }), deltas)
}

// ------------------------------------------------------------------ input thread

fn input_thread(proxy: Proxy, deltas: Arc<Deltas>) {
    INPUT.with(|c| *c.borrow_mut() = Some((proxy, deltas)));
    unsafe {
        let Ok(module) = GetModuleHandleW(None) else {
            return;
        };
        let hinstance: HINSTANCE = module.into();
        let class = w!("OneScreenInput");
        let wc = WNDCLASSEXW {
            cbSize: size_of::<WNDCLASSEXW>() as u32,
            lpfnWndProc: Some(input_wndproc),
            hInstance: hinstance,
            lpszClassName: class,
            ..Default::default()
        };
        RegisterClassExW(&wc);
        // A hidden top-level window: it receives WM_INPUT (with INPUTSINK, even in the
        // background) and the WM_DISPLAYCHANGE broadcast.
        let Ok(hwnd) = CreateWindowExW(
            WINDOW_EX_STYLE(0),
            class,
            w!("OneScreen input"),
            WS_OVERLAPPED,
            0,
            0,
            0,
            0,
            None,
            None,
            Some(hinstance),
            None,
        ) else {
            return;
        };
        let device = RAWINPUTDEVICE { usUsagePage: 0x01, usUsage: 0x02, dwFlags: RIDEV_INPUTSINK, hwndTarget: hwnd };
        let _ = RegisterRawInputDevices(&[device], size_of::<RAWINPUTDEVICE>() as u32);
        let mut msg = MSG::default();
        while GetMessageW(&mut msg, None, 0, 0).as_bool() {
            let _ = TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }
    }
}

unsafe extern "system" fn input_wndproc(hwnd: HWND, msg: u32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    match msg {
        WM_INPUT => {
            let mut raw = RAWINPUT::default();
            let mut size = size_of::<RAWINPUT>() as u32;
            let read = GetRawInputData(
                HRAWINPUT(lparam.0 as *mut c_void),
                RID_INPUT,
                Some(&mut raw as *mut RAWINPUT as *mut c_void),
                &mut size,
                size_of::<RAWINPUTHEADER>() as u32,
            );
            if read != u32::MAX && raw.header.dwType == RIM_TYPEMOUSE.0 {
                let mouse = raw.data.mouse;
                // relative movement only (tablets and remote desktops send absolute positions)
                if mouse.usFlags.0 & MOUSE_MOVE_ABSOLUTE.0 == 0 && (mouse.lLastX != 0 || mouse.lLastY != 0) {
                    INPUT.with(|c| {
                        if let Some((proxy, deltas)) = c.borrow().as_ref() {
                            if deltas.add(mouse.lLastX as f64, mouse.lLastY as f64) {
                                let _ = proxy.send_event(AppEvent::Motion);
                            }
                        }
                    });
                }
            }
        }
        WM_DISPLAYCHANGE => INPUT.with(|c| {
            if let Some((proxy, _)) = c.borrow().as_ref() {
                let _ = proxy.send_event(AppEvent::DisplaysChanged);
            }
        }),
        _ => {}
    }
    DefWindowProcW(hwnd, msg, wparam, lparam)
}

// ------------------------------------------------------------------ display configuration

struct Config {
    paths: Vec<DISPLAYCONFIG_PATH_INFO>,
    modes: Vec<DISPLAYCONFIG_MODE_INFO>,
}

fn query() -> Option<Config> {
    unsafe {
        for _ in 0..3 {
            let (mut np, mut nm) = (0u32, 0u32);
            if GetDisplayConfigBufferSizes(QDC_ONLY_ACTIVE_PATHS, &mut np, &mut nm) != ERROR_SUCCESS {
                return None;
            }
            let mut paths = vec![DISPLAYCONFIG_PATH_INFO::default(); np as usize];
            let mut modes = vec![DISPLAYCONFIG_MODE_INFO::default(); nm as usize];
            let r = QueryDisplayConfig(
                QDC_ONLY_ACTIVE_PATHS,
                &mut np,
                paths.as_mut_ptr(),
                &mut nm,
                modes.as_mut_ptr(),
                None,
            );
            if r == ERROR_INSUFFICIENT_BUFFER {
                continue; // displays changed between the two calls
            }
            if r != ERROR_SUCCESS {
                return None;
            }
            paths.truncate(np as usize);
            modes.truncate(nm as usize);
            return Some(Config { paths, modes });
        }
        None
    }
}

fn source_key(p: &DISPLAYCONFIG_PATH_INFO) -> SourceKey {
    SourceKey(p.sourceInfo.adapterId.LowPart, p.sourceInfo.adapterId.HighPart, p.sourceInfo.id)
}

fn source_mode_index(p: &DISPLAYCONFIG_PATH_INFO) -> usize {
    unsafe { p.sourceInfo.Anonymous.modeInfoIdx as usize }
}

/// M1: EDID manufacturer + product + the monitor's own serial number, so identical
/// models at different hot desks get different identities. Monitors that report no
/// serial fall back to the connector they're plugged into.
fn monitor_key(p: &DISPLAYCONFIG_PATH_INFO) -> String {
    let mut name = DISPLAYCONFIG_TARGET_DEVICE_NAME::default();
    name.header.r#type = DISPLAYCONFIG_DEVICE_INFO_GET_TARGET_NAME;
    name.header.size = size_of::<DISPLAYCONFIG_TARGET_DEVICE_NAME>() as u32;
    name.header.adapterId = p.targetInfo.adapterId;
    name.header.id = p.targetInfo.id;
    if unsafe { DisplayConfigGetDeviceInfo(&mut name.header) } != 0 {
        return format!("target-{}", p.targetInfo.id);
    }
    let path_len = name.monitorDevicePath.iter().position(|&c| c == 0).unwrap_or(name.monitorDevicePath.len());
    let path = String::from_utf16_lossy(&name.monitorDevicePath[..path_len]);
    let model = format!("{:04x}-{:04x}", name.edidManufactureId, name.edidProductCodeId);
    if let Some(serial) = edid_for_device_path(&path).as_deref().and_then(onescreen_core::edid::serial) {
        return format!("{model}-sn{serial}");
    }
    // \\?\DISPLAY#DEL41A3#5&1f2b3c&0&UID4352#{guid}
    let uid = path.split('#').nth(2).and_then(|s| s.rsplit_once("UID")).map(|(_, u)| u.to_string());
    format!("{model}-{}", uid.unwrap_or(path))
}

/// The raw EDID Windows stores for a monitor, found from its device path:
/// `\\?\DISPLAY#DEL41A3#5&1f2b3c&0&UID4352#{guid}` lives at
/// `HKLM\SYSTEM\CurrentControlSet\Enum\DISPLAY\DEL41A3\5&1f2b3c&0&UID4352\Device Parameters\EDID`.
/// Readable without admin rights.
fn edid_for_device_path(path: &str) -> Option<Vec<u8>> {
    use winreg::enums::{HKEY_LOCAL_MACHINE, KEY_READ};
    let mut parts = path.split('#');
    let _prefix = parts.next()?; // \\?\DISPLAY
    let (model, instance) = (parts.next()?, parts.next()?);
    let key = format!(r"SYSTEM\CurrentControlSet\Enum\DISPLAY\{model}\{instance}\Device Parameters");
    let params = winreg::RegKey::predef(HKEY_LOCAL_MACHINE).open_subkey_with_flags(key, KEY_READ).ok()?;
    let value = params.get_raw_value("EDID").ok()?;
    Some(value.bytes.into_owned())
}

fn dpi_scale(r: &Rect) -> f64 {
    unsafe {
        let c = r.center();
        let mon = MonitorFromPoint(POINT { x: c.x as i32, y: c.y as i32 }, MONITOR_DEFAULTTONEAREST);
        let (mut dx, mut dy) = (96u32, 96u32);
        if GetDpiForMonitor(mon, MDT_EFFECTIVE_DPI, &mut dx, &mut dy).is_ok() && dx > 0 {
            dx as f64 / 96.0
        } else {
            1.0
        }
    }
}

impl WindowsPlatform {
    fn id_for(&mut self, k: SourceKey) -> DisplayId {
        if let Some(i) = self.sources.iter().position(|s| *s == k) {
            return DisplayId(i as u32);
        }
        self.sources.push(k);
        DisplayId((self.sources.len() - 1) as u32)
    }

    fn destroy_glow(&mut self) {
        if let Some(g) = self.glow.take() {
            unsafe {
                let _ = DestroyWindow(g.hwnd);
                let _ = DeleteObject(g.bitmap.into());
                let _ = DeleteDC(g.mem);
            }
        }
    }

    fn blend(&self, alpha: f64) {
        let Some(g) = &self.glow else { return };
        let blend = BLENDFUNCTION {
            BlendOp: AC_SRC_OVER as u8,
            BlendFlags: 0,
            SourceConstantAlpha: (alpha.clamp(0.0, 1.0) * 255.0).round() as u8,
            AlphaFormat: AC_SRC_ALPHA as u8,
        };
        unsafe {
            let _ = UpdateLayeredWindow(
                g.hwnd,
                None,
                Some(&g.pos),
                Some(&g.size),
                Some(g.mem),
                Some(&POINT { x: 0, y: 0 }),
                COLORREF(0),
                Some(&blend),
                ULW_ALPHA,
            );
        }
    }
}

static GLOW_CLASS: Once = Once::new();

impl Platform for WindowsPlatform {
    fn displays(&mut self) -> (Vec<Display>, bool) {
        let Some(cfg) = query() else {
            return (vec![], false);
        };
        let mut out: Vec<Display> = Vec::new();
        let mut seen: Vec<SourceKey> = Vec::new();
        let mut mirrored = false;
        for p in &cfg.paths {
            let k = source_key(p);
            if seen.contains(&k) {
                mirrored = true; // two targets on one source: duplicated displays
                continue;
            }
            seen.push(k);
            let Some(mode) = cfg.modes.get(source_mode_index(p)) else {
                continue;
            };
            if mode.infoType != DISPLAYCONFIG_MODE_INFO_TYPE_SOURCE {
                continue;
            }
            let sm = unsafe { mode.Anonymous.sourceMode };
            let bounds = Rect::new(sm.position.x as f64, sm.position.y as f64, sm.width as f64, sm.height as f64);
            let id = self.id_for(k);
            out.push(Display {
                id,
                key: monitor_key(p),
                bounds,
                primary: sm.position.x == 0 && sm.position.y == 0,
                scale: dpi_scale(&bounds),
            });
        }
        (out, mirrored)
    }

    fn cursor(&self) -> Point {
        let mut p = POINT::default();
        unsafe {
            let _ = GetCursorPos(&mut p);
        }
        Point::new(p.x as f64, p.y as f64)
    }

    fn buttons_down(&self) -> bool {
        unsafe {
            [VK_LBUTTON, VK_RBUTTON, VK_MBUTTON].iter().any(|vk| (GetAsyncKeyState(vk.0 as i32) as u16 & 0x8000) != 0)
        }
    }

    /// G8: games and presentations report themselves to the shell.
    fn fullscreen_app(&mut self) -> bool {
        unsafe {
            matches!(
                SHQueryUserNotificationState(),
                Ok(QUNS_BUSY) | Ok(QUNS_RUNNING_D3D_FULL_SCREEN) | Ok(QUNS_PRESENTATION_MODE)
            )
        }
    }

    fn apply(&mut self, origins: &[(DisplayId, Point)]) -> Result<(), String> {
        let mut cfg = query().ok_or("QueryDisplayConfig failed")?;
        for (id, pt) in origins {
            let key = *self.sources.get(id.0 as usize).ok_or("unknown display")?;
            let path = cfg.paths.iter().find(|p| source_key(p) == key).ok_or("display is gone")?;
            let idx = source_mode_index(path);
            let mode = cfg.modes.get_mut(idx).ok_or("no source mode")?;
            // writing a union field is safe; only reads need `unsafe`
            mode.Anonymous.sourceMode.position = POINTL { x: pt.x.round() as i32, y: pt.y.round() as i32 };
        }
        // SAVE_TO_DATABASE: persists like a change made in Settings (PRD A4)
        let flags = SDC_APPLY | SDC_USE_SUPPLIED_DISPLAY_CONFIG | SDC_SAVE_TO_DATABASE | SDC_ALLOW_CHANGES;
        let r = unsafe { SetDisplayConfig(Some(&cfg.paths), Some(&cfg.modes), flags) };
        if r == ERROR_SUCCESS.0 as i32 {
            Ok(())
        } else {
            Err(format!("SetDisplayConfig failed ({r})"))
        }
    }

    fn warp(&self, p: Point) {
        unsafe {
            let _ = SetCursorPos(p.x.round() as i32, p.y.round() as i32);
        }
    }

    fn beep(&self) {
        unsafe {
            let _ = MessageBeep(MB_ICONWARNING);
        }
    }

    fn show_glow(&mut self, d: &Display, edge: Edge, _along: f64) {
        self.destroy_glow();
        let depth = 90.0 * d.scale;
        let r = glow_rect(d, edge, depth);
        let (w, h) = (r.w.round() as i32, r.h.round() as i32);
        if w <= 0 || h <= 0 {
            return;
        }
        unsafe {
            let Ok(module) = GetModuleHandleW(None) else {
                return;
            };
            let hinstance: HINSTANCE = module.into();
            let class = w!("OneScreenGlow");
            GLOW_CLASS.call_once(|| {
                let wc = WNDCLASSEXW {
                    cbSize: size_of::<WNDCLASSEXW>() as u32,
                    lpfnWndProc: Some(glow_wndproc),
                    hInstance: hinstance,
                    lpszClassName: class,
                    ..Default::default()
                };
                RegisterClassExW(&wc);
            });
            // click-through, always on top, no taskbar button, never takes focus (A6)
            let ex = WS_EX_LAYERED | WS_EX_TRANSPARENT | WS_EX_TOPMOST | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE;
            let Ok(hwnd) = CreateWindowExW(
                ex,
                class,
                PCWSTR::null(),
                WS_POPUP,
                r.x as i32,
                r.y as i32,
                w,
                h,
                None,
                None,
                Some(hinstance),
                None,
            ) else {
                return;
            };
            let screen = GetDC(None);
            let mem = CreateCompatibleDC(Some(screen));
            let bmi = BITMAPINFO {
                bmiHeader: BITMAPINFOHEADER {
                    biSize: size_of::<BITMAPINFOHEADER>() as u32,
                    biWidth: w,
                    biHeight: -h, // top-down
                    biPlanes: 1,
                    biBitCount: 32,
                    biCompression: BI_RGB.0,
                    ..Default::default()
                },
                ..Default::default()
            };
            let mut bits: *mut c_void = null_mut();
            let Ok(bitmap) = CreateDIBSection(Some(mem), &bmi, DIB_RGB_COLORS, &mut bits, None, 0) else {
                ReleaseDC(None, screen);
                let _ = DeleteDC(mem);
                let _ = DestroyWindow(hwnd);
                return;
            };
            // premultiplied BGRA gradient: accent at the edge fading to nothing
            let px = std::slice::from_raw_parts_mut(bits as *mut u8, (w * h * 4) as usize);
            let (ar, ag, ab) = ACCENT;
            for y in 0..h {
                for x in 0..w {
                    let dist = match edge {
                        Edge::Left => x as f64,
                        Edge::Right => (w - 1 - x) as f64,
                        Edge::Top => y as f64,
                        Edge::Bottom => (h - 1 - y) as f64,
                    };
                    let t = (dist / depth).clamp(0.0, 1.0);
                    let a = (1.0 - t).powi(2) * 0.85;
                    let i = ((y * w + x) * 4) as usize;
                    px[i] = (ab * a * 255.0) as u8;
                    px[i + 1] = (ag * a * 255.0) as u8;
                    px[i + 2] = (ar * a * 255.0) as u8;
                    px[i + 3] = (a * 255.0) as u8;
                }
            }
            SelectObject(mem, bitmap.into());
            ReleaseDC(None, screen);
            self.glow = Some(Glow {
                hwnd,
                mem,
                bitmap,
                pos: POINT { x: r.x as i32, y: r.y as i32 },
                size: SIZE { cx: w, cy: h },
            });
            self.blend(0.0);
            let _ = ShowWindow(hwnd, SW_SHOWNOACTIVATE);
        }
    }

    fn set_glow_alpha(&mut self, alpha: f64) {
        if alpha <= 0.0 {
            self.destroy_glow();
        } else {
            self.blend(alpha);
        }
    }

    fn reduce_motion(&self) -> bool {
        let mut animations = BOOL(1);
        unsafe {
            let _ = SystemParametersInfoW(
                SPI_GETCLIENTAREAANIMATION,
                0,
                Some(&mut animations as *mut BOOL as *mut c_void),
                SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS(0),
            );
        }
        !animations.as_bool()
    }

    fn set_launch_at_login(&self, on: bool) -> Result<(), String> {
        use winreg::enums::HKEY_CURRENT_USER;
        let run = winreg::RegKey::predef(HKEY_CURRENT_USER)
            .create_subkey(r"Software\Microsoft\Windows\CurrentVersion\Run")
            .map_err(|e| e.to_string())?
            .0;
        if on {
            let exe = std::env::current_exe().map_err(|e| e.to_string())?;
            run.set_value("OneScreen", &format!("\"{}\"", exe.display())).map_err(|e| e.to_string())
        } else {
            match run.delete_value("OneScreen") {
                Ok(()) => Ok(()),
                Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
                Err(e) => Err(e.to_string()),
            }
        }
    }
}

unsafe extern "system" fn glow_wndproc(hwnd: HWND, msg: u32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if msg == WM_NCHITTEST {
        return LRESULT(HTTRANSPARENT as isize);
    }
    DefWindowProcW(hwnd, msg, wparam, lparam)
}
