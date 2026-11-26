# StudyNest

A personal, local-first study-space web application inspired by lifeat.io — built with calm mild-blue aesthetics, frosted-glass draggable widgets, and academic typography.

## Tech Stack

- **Monorepo:** npm workspaces (`/client`, `/server`, `/shared`)
- **Client:** React 19, Vite, TypeScript, Tailwind CSS v4, Zustand, Lucide React
- **Server:** Node.js, Express 5, TypeScript, SQLite (`better-sqlite3`), Zod
- **Testing & Quality:** Vitest, ESLint, strict TypeScript

## Setup

```bash
npm install
npm run dev
```

- Client dev server: `http://localhost:5173`
- API server: `http://localhost:3001` (health check at `GET /api/health`)

## Scripts

- `npm run dev` — Run client and server concurrently
- `npm run typecheck` — Typecheck `shared`, `server`, and `client`
- `npm run lint` — Run ESLint across the monorepo
- `npm test` — Run Vitest unit & integration tests
- `npm run build` — Build all workspaces

## GitHub Pages Deployment

This repo includes [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) to build and publish `client/dist` to GitHub Pages with a `localStorage`-backed fallback for Vocab SRS, To-Dos, Notes, and Analytics.

1. Open your repository **Settings → Pages** on GitHub.
2. Under **Build and deployment → Source**, select **GitHub Actions** (instead of *Deploy from a branch*, which serves `README.md`).
3. Every push to `main` automatically deploys the StudyNest web app.

## Features

### Phase 1 — Study Window (Implemented)
- **Backgrounds:** 6 gradient presets, image URL or optimized local photo upload, looping video URL (pauses when tab is hidden), and backdrop blur/dim sliders.
- **Clock:** Digital/analog SVG toggle, 12h/24h format, and date display.
- **Pomodoro Focus Timer:** Custom focus/short-break/long-break durations, auto-cycle, soft Web Audio chime, and optional desktop notifications.
- **Spotify Embed:** Paste any Spotify playlist, album, track, episode, or show URL/URI; remembers the last link.
- **Ambient Sounds:** Soft rain, warm cafe, and white noise with individual play/pause and volume sliders backed by local looping WAV audio.
- **Themes:** 5 instant CSS-variable themes (Mild Blue default, Sage, Dusk, Paper Light, Midnight).
- **Widget Window System:** Frosted-glass panels with drag-and-drop and 8-handle resizing (8px grid snap / `Shift` to unsnap, double-click handle to reset, viewport clamping, `Arrow` / `Shift+Arrow` keyboard resize, content-responsive layouts), minimize/close, bottom dock, responsive tablet/mobile layouts, and `localStorage` persistence.

### Phase 2 — Spaced-Repetition Vocabulary (Implemented)
- **Decks & Cards:** Create/delete decks, quick-add/edit/delete cards (`word`, `meaning`, `partOfSpeech`, `example`, `notes`, `tags`), and live search.
- **SM-2 Scheduler:** Pure, unit-tested SM-2 scheduling with 4-point ratings (`Again`, `Hard`, `Good`, `Easy`) and interval previews.
- **Review Session Widget:** Due-today queue, `Space` to flip, `1–4` keyboard ratings, slim progress bar, and end-of-session summary.
- **Import / Export & Stats:** CSV and JSON import/export per deck, plus live stats (due today, new/learned counts, retention rate, review streak).
- **Seed Data:** Automatically seeds the *Academic & GRE Core* deck (10 cards) on first startup.

### Phase 3 — Supporting Tools (Implemented)
- **Daily To-Do List & Goals:** Add/check/delete today's tasks, set daily task & focus-minute targets, and track completion progress.
- **Markdown Scratchpad Notes:** Multiple notes, write/preview modes, and autosave to SQLite.
- **Study Analytics:** Automatic Pomodoro session logging plus manual session entry, 14-day focus minutes bar chart, and 12-week (84-day) streak heatmap.
- **Focus Mode & Keyboard Shortcuts:** Toggle Focus Mode (`F`) to hide the dock and keep only chosen widgets visible; press `?` to open the shortcut help overlay and configure Focus Mode widgets (`T` timetable, `K` tasks, `N` notes, `Alt + 1..9` widget toggles, `Esc` to close/exit).

### Phase 4 — Planner Suite (Implemented)
- **Courses & Timetable (`T`):** Week grid, Day, and Agenda views with current-time line, drag-to-create/move/resize, arrow-key navigation, conflict detection, "Next up" countdown banner, ICS import/export, and optional browser reminders.
- **Enhanced To-Do (`K`):** Today, Upcoming, Overdue, Done, and All views; inline quick-add syntax (`"Essay !high #cs201 tomorrow"`); subtasks; drag-to-reorder; undo toast; recurring regeneration; Pomodoro `"Focus on this"` linking; and due tasks surfaced on the timetable.
- **Enhanced Notes (`N`):** Split list/editor/live preview, 300ms debounced autosave, SQLite FTS5 full-text search, notebooks/tags/courses filtering, templates (`Lecture`, `Cornell`, `Meeting`, `Blank`), formatting toolbar, `.md` export, and selected-text → Vocab quick-add.
- **Today Overview & Shared Course Filter:** Dedicated Today widget showing next class, due tasks, vocab due, focus minutes, and a shared course filter synchronized across Timetable, Tasks, and Notes.

### Phase 5 — Options, i18n & Visual Upgrade (Implemented)
- **Options Panel (`,` & Dock Gear):** Tabbed workspace settings (`General`, `Appearance`, `Background`, `Sound`, `Shortcuts`, `Data`) with full JSON backup export/import and confirmed settings reset.
- **English & Tiếng Việt (i18n):** Instant typed localization across all UI controls, `<html lang>` sync, `Intl` date/time formatting, and `Lora`/`Inter` Vietnamese font subsets.
- **Full-Bleed Spotify Embed:** Edge-to-edge responsive iframe filling resized frames with zero scrollbars, supporting playlists, albums, tracks, episodes, shows, and artists (`open.spotify.com` & `spotify:` URIs).
- **Video Backgrounds:** Unified input for `.mp4`/`.webm` and YouTube links (Official IFrame Player API, auto-loop, 16:9 cover scaling, pause when hidden or reduced-motion, blocked/error fallback, last 5 recent sources).
- **9 Themes + Auto, Accent Swatches & 30fps Animated Canvas:** Added Lavender, Warm Sand, Ocean Teal, Rose Quartz, Auto (time-of-day), 8 AA-contrast accent swatches, Animation level (`Off`/`Low`/`Normal`), and 7 built-in 30fps canvas effects (`Rain on Glass`, `Aurora`, `Clouds`, `Starfield`, `Bokeh`, `Snowfall`, `Gradient Mesh`) with brightness, vignette, film grain, and auto-rotate.
