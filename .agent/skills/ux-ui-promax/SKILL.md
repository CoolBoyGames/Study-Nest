---
name: ux-ui-promax
description: Enforces premium, calm, accessible UX/UI for the StudyNest study-space app (mild blue, academic typography, lifeat-style widgets). Use this skill for ANY work that touches UI - components, layouts, themes, widgets, animations, icons, empty/loading/error states, responsiveness, or accessibility - and for design reviews, even if the user never mentions design, style, or UX.
---

# UX/UI Promax

Goal: an immersive, calm, distraction-free study space that feels crafted, not templated. Every UI change must follow this file.

## 1. Design principles

1. **Calm first:** low contrast surfaces, soft shadows, generous whitespace. Nothing flashes or competes with the user's focus.
2. **Content over chrome:** the background and the active widget are the stars; controls stay minimal and appear on hover/focus.
3. **Consistency:** one token set, one component per job. Never hardcode colors, sizes, or fonts in components.
4. **Speed:** every interaction responds within 100 ms. Keyboard-first for core actions.
5. **Forgiving:** confirm destructive actions, support undo where cheap, persist user layout and settings.

## 2. Design tokens (single source: `client/src/styles/tokens.css`)

All colors via CSS variables on `:root[data-theme="..."]`. Components may only use tokens.

```
--bg, --surface, --surface-glass, --border, --text, --text-muted,
--primary, --primary-hover, --accent, --success, --warning, --danger,
--radius-sm 8px, --radius-md 14px, --radius-lg 22px,
--shadow-sm, --shadow-md, --blur 16px,
--space-1..8 (4px scale), --font-heading, --font-body, --font-mono
```

**Themes (5, switch instantly, no reload):**

| Theme | Mood | Base | Primary |
|---|---|---|---|
| Mild Blue (default) | calm, airy | `#EAF2FB` | `#5B8DD6` |
| Sage | natural, soft | `#EBF3EE` | `#6FA287` |
| Dusk | warm evening | `#2A2D43` | `#8E9AF0` |
| Paper Light | bright, print-like | `#FAF8F3` | `#4A6FA5` |
| Midnight | deep focus | `#0F1626` | `#6C9CFF` |

Rules: text/background contrast >= 4.5:1 (3:1 for large text and UI borders), verified per theme. Respect `prefers-color-scheme` only for the first-run default.

## 3. Typography

- Headings: serif (Lora or Source Serif 4). Body/UI: Inter. Numbers in timers/clock: tabular figures (`font-variant-numeric: tabular-nums`).
- Scale: 12 / 14 / 16 / 20 / 28 / 40. Body 16, line-height 1.5; headings 1.2.
- Self-host or preload fonts, `font-display: swap`, load only needed weights (400, 500, 600).

## 4. Layout and widget system

- Full-screen study window: background layer (z0) < dim/blur overlay (z1) < widgets (z10) < dock (z20) < modals/toasts (z30). Keep these as named constants.
- Widgets: frosted-glass card (`--surface-glass`, `backdrop-filter: blur(var(--blur))`, 1px `--border`, `--radius-md`), draggable by header, with minimize and close.
- Snap to an 8px grid, clamp inside the viewport, persist position/visibility/size.
- Bottom dock: icon buttons with tooltips, active state, keyboard-reachable. Auto-hide in focus mode.
- Widget content padding `--space-4`; sections separated by space, not heavy dividers.
- Breakpoints: >=1024 free layout; 640-1023 stacked/snapped columns; <640 one widget at a time as a bottom sheet.

## 5. Components and states

Build once, reuse: `Button` (primary, ghost, icon), `IconButton`, `Card`, `Input`, `Select`, `Slider`, `Toggle`, `Tabs`, `Modal`, `Toast`, `Tooltip`, `ProgressBar`, `Skeleton`, `EmptyState`.

Every data-driven view must implement **all** of:
- **Loading:** skeleton, not spinner-only
- **Empty:** one friendly line plus a primary action
- **Error:** plain-language message, retry action, no stack traces
- **Success/feedback:** subtle toast or inline confirmation

Icons: one library (lucide-react), 1.5px stroke, 20px default. No emoji as UI icons.

## 6. Motion

- Duration 120-240 ms, easing `cubic-bezier(0.2, 0.8, 0.2, 1)`. Animate only `opacity` and `transform`.
- Purposeful only: open/close widgets, card flip, theme crossfade (200 ms), progress.
- Honor `prefers-reduced-motion: reduce` (disable non-essential motion, keep state changes instant).
- Video and animated backgrounds pause when the tab is hidden.

## 7. Spaced-repetition review UX

- One card at a time, centered, large type; flip with `Space`; rate with `1-4` (Again/Hard/Good/Easy), buttons show the next interval (e.g. "Good - 3d").
- Persistent slim progress bar and "due left" count. Session summary: reviewed, accuracy, streak, next due.
- Never punish: wrong answers use soft `--warning` tone, not red alarms.

## 8. Accessibility (non-negotiable)

- Full keyboard operation; visible 2px focus ring using `--primary` with 2px offset; logical tab order; focus trapped in modals and restored on close.
- Semantic HTML first; ARIA only to fill gaps. Icon-only buttons need `aria-label`. Live regions for timer completion and toasts.
- Hit targets >= 40x40px. Never rely on color alone for meaning.
- Provide a shortcut help overlay (`?`) listing all shortcuts.

## 9. Performance and polish

- Budget: first load < 200 KB JS gzipped (excluding media), 60 fps while dragging widgets.
- Lazy-load heavy widgets (Spotify embed, analytics charts). Debounce persistence writes (300 ms).
- Optimize images (WebP, max 1920px for backgrounds); lazy-load previews.
- No layout shift: reserve space for embeds and images.

## 10. Workflow and review gate

1. Before building UI: reuse existing components and tokens; list what is new in one line.
2. Build mobile-narrow and desktop; switch through **all 5 themes**.
3. Run the app and check in the browser: hover, focus, keyboard path, empty/loading/error states, reduced-motion.
4. Run an accessibility check (axe or Lighthouse) and fix every critical issue.
5. Report only: **Changed / Verified (themes, breakpoints, a11y) / Issues**. Show diffs and file paths, never whole files.

## 11. Never do

- Hardcoded hex colors, magic pixel values, inline styles for theming.
- Pure `#000`/`#FFF` surfaces, heavy borders, neon or saturated gradients, drop shadows above `--shadow-md`.
- Autoplaying sound, modal popups on load, or notification spam.
- Placeholder lorem text or broken images in finished UI.
- Adding a new UI library when an existing component can do the job.
