//! Behaviour tests for the PRD rules. Coordinates are points, origin top-left of the primary.

use onescreen_core::arrange::plan_flip;
use onescreen_core::gesture::{GestureDetector, Push};
use onescreen_core::memory::{desk_id, Memory};
use onescreen_core::*;

fn display(id: u32, key: &str, x: f64, y: f64, w: f64, h: f64, primary: bool) -> Display {
    Display { id: DisplayId(id), key: key.into(), bounds: Rect::new(x, y, w, h), primary, scale: 1.0 }
}

/// Laptop is primary at (0,0). The monitor is configured on the LEFT, but physically sits on the right.
fn wrong_side() -> Vec<Display> {
    vec![
        display(1, "laptop", 0.0, 0.0, 1512.0, 982.0, true),
        display(2, "dell", -2560.0, -300.0, 2560.0, 1440.0, false),
    ]
}

fn motion(t: f64, x: f64, y: f64, dx: f64, dy: f64) -> Motion {
    Motion { t, pos: Point::new(x, y), dx, dy, buttons: false, fullscreen: false }
}

/// Push right against the laptop's right edge: `n` samples of `dx`, 10 ms apart.
fn push_right(g: &mut GestureDetector, ds: &[Display], cfg: &Config, t0: f64, n: usize, dx: f64) -> Option<Push> {
    let mut hit = None;
    for i in 0..n {
        if let Some(p) = g.on_motion(&motion(t0 + i as f64 * 0.01, 1511.0, 500.0, dx, 0.0), ds, cfg) {
            hit = Some(p);
        }
    }
    hit
}

// ---------------------------------------------------------------- gesture (§7.1)

#[test]
fn g2_triggers_after_threshold() {
    let (ds, cfg) = (wrong_side(), Config::default());
    let mut g = GestureDetector::new();
    // 39 x 10 = 390 < 400: not yet
    assert!(push_right(&mut g, &ds, &cfg, 0.0, 39, 10.0).is_none());
    let p = push_right(&mut g, &ds, &cfg, 0.39, 1, 10.0).expect("should trigger at 400");
    assert_eq!((p.display, p.edge), (DisplayId(1), Edge::Right));
}

#[test]
fn g2_sensitivity_changes_threshold() {
    let ds = wrong_side();
    for (s, need) in [(Sensitivity::High, 250), (Sensitivity::Medium, 400), (Sensitivity::Low, 700)] {
        let cfg = Config { sensitivity: s, ..Config::default() };
        let n = need / 10;
        assert!(push_right(&mut GestureDetector::new(), &ds, &cfg, 0.0, n - 1, 10.0).is_none(), "{s:?} fired early");
        assert!(push_right(&mut GestureDetector::new(), &ds, &cfg, 0.0, n, 10.0).is_some(), "{s:?} never fired");
    }
}

#[test]
fn g2_slow_pushes_outside_the_window_do_not_add_up() {
    let (ds, cfg) = (wrong_side(), Config::default());
    let mut g = GestureDetector::new();
    // 100 per 0.5 s: never 400 inside 1.2 s
    for i in 0..20 {
        assert!(g.on_motion(&motion(i as f64 * 0.5, 1511.0, 500.0, 100.0, 0.0), &ds, &cfg).is_none());
    }
}

#[test]
fn g3_leaving_the_edge_resets() {
    let (ds, cfg) = (wrong_side(), Config::default());
    let mut g = GestureDetector::new();
    push_right(&mut g, &ds, &cfg, 0.0, 30, 10.0); // 300
    g.on_motion(&motion(0.31, 1300.0, 500.0, -50.0, 0.0), &ds, &cfg); // moved away
    assert!(push_right(&mut g, &ds, &cfg, 0.32, 30, 10.0).is_none(), "count should restart");
}

#[test]
fn g4_corners_are_ignored() {
    let (ds, cfg) = (wrong_side(), Config::default());
    let mut g = GestureDetector::new();
    for i in 0..100 {
        assert!(g.on_motion(&motion(i as f64 * 0.01, 1511.0, 10.0, 20.0, 0.0), &ds, &cfg).is_none());
    }
}

#[test]
fn g5_edges_with_a_neighbour_are_ignored() {
    // monitor correctly on the right: the OS lets the cursor through, we must do nothing
    let ds = vec![
        display(1, "laptop", 0.0, 0.0, 1512.0, 982.0, true),
        display(2, "dell", 1512.0, -300.0, 2560.0, 1440.0, false),
    ];
    let mut g = GestureDetector::new();
    assert!(push_right(&mut g, &ds, &Config::default(), 0.0, 100, 20.0).is_none());
}

#[test]
fn g5_partial_neighbour_only_covers_its_span() {
    // a short monitor on the right covers y 0..400; pushing at y=900 is a dead edge
    let ds = vec![
        display(1, "laptop", 0.0, 0.0, 1512.0, 982.0, true),
        display(2, "small", 1512.0, 0.0, 800.0, 400.0, false),
    ];
    let mut g = GestureDetector::new();
    let mut fired = false;
    for i in 0..60 {
        fired |= g.on_motion(&motion(i as f64 * 0.01, 1511.0, 900.0, 10.0, 0.0), &ds, &Config::default()).is_some();
    }
    assert!(fired);
}

#[test]
fn g6_cooldown_after_a_flip() {
    let (ds, cfg) = (wrong_side(), Config::default());
    let mut g = GestureDetector::new();
    assert!(push_right(&mut g, &ds, &cfg, 0.0, 40, 10.0).is_some());
    assert!(push_right(&mut g, &ds, &cfg, 0.5, 100, 10.0).is_none(), "inside the 2 s cooldown");
    assert!(push_right(&mut g, &ds, &cfg, 3.0, 40, 10.0).is_some());
}

#[test]
fn g7_buttons_held_never_trigger() {
    let (ds, cfg) = (wrong_side(), Config::default());
    let mut g = GestureDetector::new();
    for i in 0..200 {
        let m = Motion { buttons: true, ..motion(i as f64 * 0.01, 1511.0, 500.0, 20.0, 0.0) };
        assert!(g.on_motion(&m, &ds, &cfg).is_none());
    }
}

#[test]
fn g8_fullscreen_never_triggers_unless_disabled() {
    let ds = wrong_side();
    let mut g = GestureDetector::new();
    let m = |i: usize| Motion { fullscreen: true, ..motion(i as f64 * 0.01, 1511.0, 500.0, 20.0, 0.0) };
    assert!((0..100).all(|i| g.on_motion(&m(i), &ds, &Config::default()).is_none()));
    let cfg = Config { ignore_fullscreen: false, ..Config::default() };
    assert!((0..100).any(|i| g.on_motion(&m(i), &ds, &cfg).is_some()));
}

#[test]
fn g9_single_display_does_nothing() {
    let ds = vec![display(1, "laptop", 0.0, 0.0, 1512.0, 982.0, true)];
    let mut g = GestureDetector::new();
    assert!(push_right(&mut g, &ds, &Config::default(), 0.0, 200, 20.0).is_none());
}

#[test]
fn sliding_along_the_edge_does_not_count() {
    let (ds, cfg) = (wrong_side(), Config::default());
    let mut g = GestureDetector::new();
    // pinned at the right edge, moving diagonally up-right toward the corner zone
    for i in 0..60 {
        let y = 900.0 - i as f64 * 12.0;
        assert!(g.on_motion(&motion(i as f64 * 0.01, 1511.0, y, 12.0, -12.0), &ds, &cfg).is_none());
    }
}

#[test]
fn disabled_does_nothing() {
    let cfg = Config { enabled: false, ..Config::default() };
    let mut g = GestureDetector::new();
    assert!(push_right(&mut g, &wrong_side(), &cfg, 0.0, 200, 20.0).is_none());
}

#[test]
fn dpi_scale_raises_the_threshold() {
    let mut ds = wrong_side();
    ds[0].scale = 2.0; // Windows at 200 %: 800 physical px
    let mut g = GestureDetector::new();
    assert!(push_right(&mut g, &ds, &Config::default(), 0.0, 79, 10.0).is_none());
    assert!(push_right(&mut g, &ds, &Config::default(), 0.79, 1, 10.0).is_some());
}

// ---------------------------------------------------------------- arranger (§7.2)

#[test]
fn a1_moves_the_other_display_beside_the_push_centred() {
    let ds = wrong_side();
    let plan =
        plan_flip(&ds, &Push { display: DisplayId(1), edge: Edge::Right, at: Point::new(1511.0, 491.0) }).unwrap();
    // monitor 2560x1440 centred on the laptop's right edge: x = 1512, y = 491 - 720 = -229
    assert_eq!(plan.origins, vec![(DisplayId(2), Point::new(1512.0, -229.0))]);
    assert_eq!(plan.landing.display, DisplayId(2));
    assert_eq!(plan.landing.edge, Edge::Left);
    assert!((plan.landing.along - 0.5).abs() < 0.01);
}

#[test]
fn a3_primary_target_moves_the_source_instead() {
    // monitor is primary at (0,0); laptop configured on its right, physically on its left.
    let ds = vec![
        display(1, "dell", 0.0, 0.0, 2560.0, 1440.0, true),
        display(2, "laptop", 2560.0, 200.0, 1512.0, 982.0, false),
    ];
    // user pushes LEFT from the laptop's left edge? No: the left edge of the laptop has the monitor. They push
    // RIGHT from the monitor's right edge? That edge has the laptop. Realistic case: laptop is physically on the
    // left, so the user pushes LEFT from the monitor.
    let plan = plan_flip(&ds, &Push { display: DisplayId(1), edge: Edge::Left, at: Point::new(1.0, 720.0) }).unwrap();
    // target is the laptop (not primary) -> laptop moves to the left of the monitor
    assert_eq!(plan.origins, vec![(DisplayId(2), Point::new(-1512.0, 229.0))]);

    // now the laptop is primary and the monitor sits on its right; the user pushes LEFT from the laptop
    let ds = vec![
        display(1, "dell", -2560.0, -200.0, 2560.0, 1440.0, false),
        display(2, "laptop", 0.0, 0.0, 1512.0, 982.0, true),
    ];
    let plan = plan_flip(&ds, &Push { display: DisplayId(1), edge: Edge::Right, at: Point::new(-1.0, 500.0) }).unwrap();
    // target (laptop) is primary: the monitor (source) moves to the laptop's LEFT side... i.e. opposite of Right
    assert_eq!(plan.origins[0].0, DisplayId(1));
    assert_eq!(plan.origins[0].1, Point::new(-2560.0, -229.0));
}

#[test]
fn a2_three_displays_moves_the_furthest() {
    let ds = vec![
        display(1, "laptop", 0.0, 0.0, 1512.0, 982.0, true),
        display(2, "left-near", -1920.0, 0.0, 1920.0, 1080.0, false),
        display(3, "left-far", -3840.0, 0.0, 1920.0, 1080.0, false),
    ];
    let plan =
        plan_flip(&ds, &Push { display: DisplayId(1), edge: Edge::Right, at: Point::new(1511.0, 491.0) }).unwrap();
    assert_eq!(plan.origins[0].0, DisplayId(3));
    assert_eq!(plan.origins[0].1.x, 1512.0);
}

#[test]
fn moved_display_never_overlaps_a_third() {
    let ds = vec![
        display(1, "laptop", 0.0, 0.0, 1512.0, 982.0, true),
        display(2, "right", 1512.0, 0.0, 1920.0, 1080.0, false),
        display(3, "left", -1920.0, 0.0, 1920.0, 1080.0, false),
    ];
    // push down from the laptop's bottom edge: furthest from "down" is the top-most; all equal, any is fine
    let plan =
        plan_flip(&ds, &Push { display: DisplayId(1), edge: Edge::Bottom, at: Point::new(756.0, 981.0) }).unwrap();
    let (id, o) = plan.origins[0];
    let moved = ds.iter().find(|d| d.id == id).unwrap().bounds.with_origin(o);
    for d in ds.iter().filter(|d| d.id != id) {
        assert!(!moved.overlaps(&d.bounds), "{id:?} overlaps {:?}", d.id);
    }
}

// ---------------------------------------------------------------- memory (§7.3)

#[test]
fn m2_desk_id_ignores_order() {
    let mut a = wrong_side();
    let b = wrong_side();
    a.reverse();
    assert_eq!(desk_id(&a), desk_id(&b));
}

#[test]
fn m6_identical_monitors_get_distinct_keys() {
    let mut ds = vec![
        display(5, "dell-u2723", 1512.0, 0.0, 2560.0, 1440.0, false),
        display(4, "dell-u2723", -2560.0, 0.0, 2560.0, 1440.0, false),
        display(1, "laptop", 0.0, 0.0, 1512.0, 982.0, true),
    ];
    onescreen_core::display::disambiguate_keys(&mut ds);
    assert_eq!(ds[1].key, "dell-u2723");
    assert_eq!(ds[0].key, "dell-u2723#2");
}

#[test]
fn m3_restore_plan_round_trip() {
    let right = vec![
        display(1, "laptop", 0.0, 0.0, 1512.0, 982.0, true),
        display(2, "dell", 1512.0, -229.0, 2560.0, 1440.0, false),
    ];
    let mut mem = Memory::default();
    assert!(mem.remember(&right));
    assert!(!mem.remember(&right), "no change, nothing to save");
    let layout = mem.get(&desk_id(&right)).unwrap();
    assert!(layout.restore_plan(&right).is_none(), "already matches");
    assert_eq!(layout.restore_plan(&wrong_side()).unwrap(), vec![(DisplayId(2), Point::new(1512.0, -229.0))]);
}

// ---------------------------------------------------------------- engine (end to end)

fn displays_event(t: f64, ds: Vec<Display>) -> Event {
    Event::Displays { t, displays: ds, mirrored: false }
}

#[test]
fn flip_end_to_end_warp_and_glow_after_the_os_confirms() {
    let mut e = Engine::new(State::default());
    e.handle(displays_event(0.0, wrong_side()));
    let learned = e.handle(Event::Tick { t: 1.0 });
    assert_eq!(learned, vec![Action::Save], "unknown desk is learned after settling");

    let mut actions = vec![];
    for i in 0..60 {
        actions.extend(e.handle(Event::Motion(motion(2.0 + i as f64 * 0.01, 1511.0, 491.0, 10.0, 0.0))));
    }
    assert_eq!(actions, vec![Action::Apply(vec![(DisplayId(2), Point::new(1512.0, -229.0))])]);
    assert!(e.can_undo());

    // the OS reports the new layout
    let mut fixed = wrong_side();
    fixed[1].bounds = fixed[1].bounds.with_origin(Point::new(1512.0, -229.0));
    let after = e.handle(Event::Applied { t: 2.7, ok: true, displays: Some(fixed.clone()) });
    assert_eq!(after[0], Action::Warp(Point::new(1514.0, 491.0)), "same relative height, just inside the left edge");
    assert!(matches!(after[1], Action::Flash { display: DisplayId(2), edge: Edge::Left, .. }));
    assert_eq!(after[2], Action::Save, "the new layout is remembered for this desk");

    // undo goes back
    assert_eq!(e.undo(3.0), vec![Action::Apply(vec![(DisplayId(2), Point::new(-2560.0, -300.0))])]);
}

#[test]
fn a8_failed_apply_beeps_and_changes_nothing() {
    let mut e = Engine::new(State::default());
    e.handle(displays_event(0.0, wrong_side()));
    e.handle(Event::Tick { t: 1.0 });
    for i in 0..60 {
        e.handle(Event::Motion(motion(2.0 + i as f64 * 0.01, 1511.0, 491.0, 10.0, 0.0)));
    }
    assert_eq!(e.handle(Event::Applied { t: 2.7, ok: false, displays: None }), vec![Action::Beep]);
    assert!(!e.can_undo());
}

#[test]
fn m4_known_desk_is_restored_after_settling() {
    let right = vec![
        display(1, "laptop", 0.0, 0.0, 1512.0, 982.0, true),
        display(2, "dell", 1512.0, -229.0, 2560.0, 1440.0, false),
    ];
    let mut mem = Memory::default();
    mem.remember(&right);
    let mut e = Engine::new(State { config: Config::default(), memory: mem });

    // plug in: the OS brings the monitor back on the wrong side, with a couple of flickers
    assert!(e.handle(displays_event(0.0, wrong_side())).is_empty());
    assert!(e.handle(displays_event(0.4, wrong_side())).is_empty());
    assert!(e.handle(Event::Tick { t: 1.0 }).is_empty(), "not settled yet: last change was at 0.4");
    assert_eq!(e.next_wake(), Some(1.4));
    let a = e.handle(Event::Tick { t: 1.4 });
    assert_eq!(a, vec![Action::Apply(vec![(DisplayId(2), Point::new(1512.0, -229.0))])]);
    let done = e.handle(Event::Applied { t: 1.5, ok: true, displays: Some(right) });
    assert!(matches!(done[0], Action::Flash { display: DisplayId(2), edge: Edge::Left, .. }), "{done:?}");
}

#[test]
fn m5_manual_changes_are_remembered() {
    let mut e = Engine::new(State::default());
    e.handle(displays_event(0.0, wrong_side()));
    e.handle(Event::Tick { t: 1.0 });
    let mut moved = wrong_side();
    moved[1].bounds = moved[1].bounds.with_origin(Point::new(0.0, -1440.0)); // user put it above in Settings
    assert_eq!(e.handle(displays_event(5.0, moved)), vec![Action::Save]);
    assert_eq!(e.desks_remembered(), 1);
}

#[test]
fn remember_off_never_restores() {
    let right = vec![
        display(1, "laptop", 0.0, 0.0, 1512.0, 982.0, true),
        display(2, "dell", 1512.0, -229.0, 2560.0, 1440.0, false),
    ];
    let mut mem = Memory::default();
    mem.remember(&right);
    let mut e = Engine::new(State { config: Config { remember_desks: false, ..Config::default() }, memory: mem });
    e.handle(displays_event(0.0, wrong_side()));
    assert!(e.handle(Event::Tick { t: 2.0 }).is_empty());
}

#[test]
fn mirrored_displays_do_nothing() {
    let mut e = Engine::new(State::default());
    e.handle(Event::Displays { t: 0.0, displays: wrong_side(), mirrored: true });
    e.handle(Event::Tick { t: 1.0 });
    let mut acts = vec![];
    for i in 0..100 {
        acts.extend(e.handle(Event::Motion(motion(2.0 + i as f64 * 0.01, 1511.0, 491.0, 10.0, 0.0))));
    }
    assert!(acts.is_empty());
}

#[test]
fn state_round_trips_through_json_and_tolerates_missing_fields() {
    let mut e = Engine::new(State::default());
    e.handle(displays_event(0.0, wrong_side()));
    e.handle(Event::Tick { t: 1.0 });
    let json = serde_json::to_string(&e.state()).unwrap();
    let back: State = serde_json::from_str(&json).unwrap();
    assert_eq!(back, e.state());
    let partial: State = serde_json::from_str(r#"{"config":{"sensitivity":"high"}}"#).unwrap();
    assert_eq!(partial.config.sensitivity, Sensitivity::High);
    assert!(partial.config.enabled);
}

// ---------------------------------------------------------------- false-trigger trace (PRD §15)

/// A long, deterministic "normal use" trace: wandering, flicking to edges and corners
/// (scroll bars, Hot Corners, menus), dragging, quick bumps against dead edges.
#[test]
fn no_false_triggers_in_normal_use() {
    let ds = wrong_side();
    let mut e = Engine::new(State::default());
    e.handle(displays_event(0.0, ds.clone()));
    e.handle(Event::Tick { t: 1.0 });

    let mut seed: u64 = 0x5eed;
    let mut rnd = || {
        seed ^= seed << 13;
        seed ^= seed >> 7;
        seed ^= seed << 17;
        (seed % 10_000) as f64 / 10_000.0
    };
    let laptop = ds[0].bounds;
    let (mut x, mut y) = (700.0, 500.0);
    let mut t = 2.0;
    let mut actions = vec![];
    let mut overshoot = 0.0;
    for step in 0..40_000 {
        t += 0.008;
        // bursts toward an edge every so often, otherwise wander
        let (mut dx, mut dy) = ((rnd() - 0.5) * 30.0, (rnd() - 0.5) * 30.0);
        if step % 900 == 0 {
            overshoot = 0.0;
        }
        if step % 900 < 40 && overshoot < 220.0 {
            // flick right into the dead edge: a normal bump overshoots by a couple of hundred points, then stops
            dx = 28.0;
            if x >= laptop.right() - 2.0 {
                overshoot += dx;
            }
        }
        if step % 1300 < 20 {
            dx = 25.0; // toward the top-right corner
            dy = -25.0;
        }
        let buttons = step % 2000 < 200; // dragging a window around
        if buttons {
            dx = 30.0;
        }
        x = (x + dx).clamp(laptop.left(), laptop.right() - 1.0);
        y = (y + dy).clamp(laptop.top(), laptop.bottom() - 1.0);
        let a = e.handle(Event::Motion(Motion { t, pos: Point::new(x, y), dx, dy, buttons, fullscreen: false }));
        if !a.is_empty() && std::env::var("TRACE_DEBUG").is_ok() {
            eprintln!("step {step} pos=({x:.0},{y:.0}) dx={dx:.1} dy={dy:.1} buttons={buttons} -> {a:?}");
        }
        actions.extend(a);
    }
    let flips: Vec<_> = actions.iter().filter(|a| matches!(a, Action::Apply(_))).collect();
    assert!(flips.is_empty(), "false triggers: {flips:?}");
}
