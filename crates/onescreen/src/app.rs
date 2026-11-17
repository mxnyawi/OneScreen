//! The event loop: wires OS input and display changes into the core engine,
//! carries out its actions, and runs the tray / menu bar menu (PRD §6.3).

use std::time::{Duration, Instant};

use onescreen_core::{Action, Engine, Event as CoreEvent, Motion, Sensitivity};
use tao::event::{Event, StartCause};
use tao::event_loop::{ControlFlow, EventLoopBuilder, EventLoopProxy};
use tray_icon::menu::{CheckMenuItem, Menu, MenuEvent, MenuItem, PredefinedMenuItem, Submenu};
use tray_icon::{TrayIcon, TrayIconBuilder};

use crate::platform::{self, GlowFade, Platform};
use crate::{icon, store};

pub const REPO_URL: &str = "https://github.com/mxnyawi/OneScreen";

/// Events sent to the main loop from input callbacks, the display-change hook and the menu.
#[derive(Debug)]
pub enum AppEvent {
    /// Raw mouse movement is waiting in the platform's delta buffer.
    Motion,
    DisplaysChanged,
    Menu(MenuEvent),
}

pub type Proxy = EventLoopProxy<AppEvent>;

struct MenuItems {
    enabled: CheckMenuItem,
    low: CheckMenuItem,
    medium: CheckMenuItem,
    high: CheckMenuItem,
    remember: CheckMenuItem,
    glow: CheckMenuItem,
    fullscreen: CheckMenuItem,
    undo: MenuItem,
    forget: MenuItem,
    login: CheckMenuItem,
    about: MenuItem,
    quit: MenuItem,
}

struct App {
    engine: Engine,
    platform: Box<dyn Platform>,
    deltas: std::sync::Arc<platform::Deltas>,
    epoch: Instant,
    glow: Option<GlowFade>,
    fullscreen_cache: (Instant, bool),
    items: MenuItems,
    _tray: TrayIcon,
}

pub fn run() {
    #[allow(unused_mut)]
    let mut event_loop = EventLoopBuilder::<AppEvent>::with_user_event().build();
    #[cfg(target_os = "macos")]
    {
        use tao::platform::macos::{ActivationPolicy, EventLoopExtMacOS};
        // menu bar only: no Dock icon (PRD S1)
        event_loop.set_activation_policy(ActivationPolicy::Accessory);
    }
    let proxy = event_loop.create_proxy();
    {
        let proxy = proxy.clone();
        MenuEvent::set_event_handler(Some(move |e| {
            let _ = proxy.send_event(AppEvent::Menu(e));
        }));
    }

    let mut app: Option<App> = None;
    event_loop.run(move |event, _target, control_flow| {
        match event {
            // The tray must be created once the loop is running (tray-icon requirement on macOS).
            Event::NewEvents(StartCause::Init) => {
                app = Some(App::start(proxy.clone()));
            }
            Event::UserEvent(e) => {
                if let Some(app) = app.as_mut() {
                    if app.on_event(e) {
                        *control_flow = ControlFlow::Exit;
                        return;
                    }
                }
            }
            _ => {}
        }
        if let Some(app) = app.as_mut() {
            *control_flow = app.after_event();
        }
    });
}

impl App {
    fn start(proxy: Proxy) -> App {
        let state = store::load();
        let (platform, deltas) = platform::start(proxy);
        let engine = Engine::new(state);
        let items = build_items(engine.config());
        let menu = Menu::new();
        let sens =
            Submenu::with_items("Sensitivity", true, &[&items.low, &items.medium, &items.high]).expect("submenu");
        let mut entries: Vec<&dyn tray_icon::menu::IsMenuItem> =
            vec![&items.enabled, &sens, &items.remember, &items.glow];
        if cfg!(windows) {
            entries.push(&items.fullscreen);
        }
        let sep1 = PredefinedMenuItem::separator();
        let sep2 = PredefinedMenuItem::separator();
        let sep3 = PredefinedMenuItem::separator();
        entries.extend([
            &sep1 as &dyn tray_icon::menu::IsMenuItem,
            &items.undo,
            &items.forget,
            &sep2,
            &items.login,
            &items.about,
            &sep3,
            &items.quit,
        ]);
        for e in entries {
            let _ = menu.append(e);
        }
        let builder = TrayIconBuilder::new().with_menu(Box::new(menu)).with_tooltip("OneScreen");
        // macOS: a template icon follows the menu bar's light/dark appearance
        #[cfg(target_os = "macos")]
        let builder = builder.with_icon_templated(icon::tray_icon());
        #[cfg(not(target_os = "macos"))]
        let builder = builder.with_icon(icon::tray_icon());
        let tray = builder.build().expect("could not create the tray icon");

        let mut app = App {
            engine,
            platform,
            deltas,
            epoch: Instant::now(),
            glow: None,
            fullscreen_cache: (Instant::now() - Duration::from_secs(10), false),
            items,
            _tray: tray,
        };
        app.refresh_displays();
        app.sync_menu();
        app
    }

    fn now(&self) -> f64 {
        self.epoch.elapsed().as_secs_f64()
    }

    /// Returns true to quit.
    fn on_event(&mut self, e: AppEvent) -> bool {
        match e {
            AppEvent::Motion => {
                let (dx, dy) = self.deltas.take();
                if dx == 0.0 && dy == 0.0 {
                    return false;
                }
                let fullscreen = self.engine.config().ignore_fullscreen && self.fullscreen();
                let m = Motion {
                    t: self.now(),
                    pos: self.platform.cursor(),
                    dx,
                    dy,
                    buttons: self.platform.buttons_down(),
                    fullscreen,
                };
                let actions = self.engine.handle(CoreEvent::Motion(m));
                self.perform(actions);
            }
            AppEvent::DisplaysChanged => self.refresh_displays(),
            AppEvent::Menu(m) => return self.on_menu(m),
        }
        false
    }

    /// Called after every event: ticks the engine, steps the glow, picks the next wake-up.
    fn after_event(&mut self) -> ControlFlow {
        let now = self.now();
        if self.engine.next_wake().is_some_and(|w| w <= now) {
            let actions = self.engine.handle(CoreEvent::Tick { t: now });
            self.perform(actions);
        }
        let mut wake: Option<Instant> = self.engine.next_wake().map(|w| self.epoch + Duration::from_secs_f64(w));
        if let Some(g) = &self.glow {
            match g.alpha(Instant::now()) {
                Some(a) => {
                    self.platform.set_glow_alpha(a);
                    let next = Instant::now() + GlowFade::FRAME;
                    wake = Some(wake.map_or(next, |w| w.min(next)));
                }
                None => {
                    self.platform.set_glow_alpha(0.0);
                    self.glow = None;
                }
            }
        }
        match wake {
            Some(at) => ControlFlow::WaitUntil(at),
            None => ControlFlow::Wait,
        }
    }

    fn refresh_displays(&mut self) {
        let (displays, mirrored) = self.platform.displays();
        let t = self.now();
        let actions = self.engine.handle(CoreEvent::Displays { t, displays, mirrored });
        self.perform(actions);
    }

    fn fullscreen(&mut self) -> bool {
        // cheap enough, but there's no need to ask on every mouse report
        if self.fullscreen_cache.0.elapsed() > Duration::from_secs(1) {
            self.fullscreen_cache = (Instant::now(), self.platform.fullscreen_app());
        }
        self.fullscreen_cache.1
    }

    fn perform(&mut self, actions: Vec<Action>) {
        for a in actions {
            match a {
                Action::Apply(origins) => {
                    let ok = self.platform.apply(&origins).is_ok();
                    let displays = ok.then(|| self.platform.displays().0);
                    let t = self.now();
                    let more = self.engine.handle(CoreEvent::Applied { t, ok, displays });
                    self.perform(more);
                }
                Action::Warp(p) => self.platform.warp(p),
                Action::Flash { display, edge, along } => {
                    if self.platform.reduce_motion() {
                        continue;
                    }
                    if let Some(d) = self.engine.displays().iter().find(|d| d.id == display).cloned() {
                        self.platform.show_glow(&d, edge, along);
                        self.glow = Some(GlowFade::new());
                    }
                }
                Action::Beep => self.platform.beep(),
                Action::Save => store::save(&self.engine.state()),
            }
        }
        self.sync_menu();
    }

    fn on_menu(&mut self, e: MenuEvent) -> bool {
        let id = &e.id;
        let i = &self.items;
        if id == i.quit.id() {
            return true;
        }
        if id == i.about.id() {
            let _ = open::that(REPO_URL);
            return false;
        }
        if id == i.undo.id() {
            let t = self.now();
            let actions = self.engine.undo(t);
            self.perform(actions);
            return false;
        }
        if id == i.forget.id() {
            let actions = self.engine.forget_desks();
            self.perform(actions);
            return false;
        }
        let login_toggled = id == i.login.id();
        {
            let c = self.engine.config_mut();
            if id == i.enabled.id() {
                c.enabled = !c.enabled;
            } else if id == i.low.id() {
                c.sensitivity = Sensitivity::Low;
            } else if id == i.medium.id() {
                c.sensitivity = Sensitivity::Medium;
            } else if id == i.high.id() {
                c.sensitivity = Sensitivity::High;
            } else if id == i.remember.id() {
                c.remember_desks = !c.remember_desks;
            } else if id == i.glow.id() {
                c.glow = !c.glow;
            } else if id == i.fullscreen.id() {
                c.ignore_fullscreen = !c.ignore_fullscreen;
            } else if login_toggled {
                c.launch_at_login = !c.launch_at_login;
            }
        }
        if login_toggled {
            let on = self.engine.config().launch_at_login;
            if self.platform.set_launch_at_login(on).is_err() {
                self.engine.config_mut().launch_at_login = !on;
                self.platform.beep();
            }
        }
        store::save(&self.engine.state());
        self.sync_menu();
        false
    }

    /// Menu check marks always mirror the config (muda toggles check items on click by itself).
    fn sync_menu(&self) {
        let c = self.engine.config();
        let i = &self.items;
        i.enabled.set_checked(c.enabled);
        i.low.set_checked(c.sensitivity == Sensitivity::Low);
        i.medium.set_checked(c.sensitivity == Sensitivity::Medium);
        i.high.set_checked(c.sensitivity == Sensitivity::High);
        i.remember.set_checked(c.remember_desks);
        i.glow.set_checked(c.glow);
        i.fullscreen.set_checked(c.ignore_fullscreen);
        i.login.set_checked(c.launch_at_login);
        i.undo.set_enabled(self.engine.can_undo());
        let n = self.engine.desks_remembered();
        i.forget.set_text(if n == 1 {
            "Forget 1 learned desk".to_string()
        } else {
            format!("Forget {n} learned desks")
        });
        i.forget.set_enabled(n > 0);
    }
}

fn build_items(c: &onescreen_core::Config) -> MenuItems {
    MenuItems {
        enabled: CheckMenuItem::new("Enabled", true, c.enabled, None),
        low: CheckMenuItem::new("Low", true, c.sensitivity == Sensitivity::Low, None),
        medium: CheckMenuItem::new("Medium", true, c.sensitivity == Sensitivity::Medium, None),
        high: CheckMenuItem::new("High", true, c.sensitivity == Sensitivity::High, None),
        remember: CheckMenuItem::new("Remember layout per desk", true, c.remember_desks, None),
        glow: CheckMenuItem::new("Edge glow", true, c.glow, None),
        fullscreen: CheckMenuItem::new("Pause during full-screen apps", true, c.ignore_fullscreen, None),
        undo: MenuItem::new("Undo last flip", false, None),
        forget: MenuItem::new("Forget learned desks", true, None),
        login: CheckMenuItem::new("Launch at login", true, c.launch_at_login, None),
        about: MenuItem::new("About OneScreen", true, None),
        quit: MenuItem::new("Quit OneScreen", true, None),
    }
}
