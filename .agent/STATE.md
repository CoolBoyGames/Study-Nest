# STATE
Phase: 4 + Resizable Widgets (Complete)
Done: Phases 1-4 + Resizable WidgetWindow (8 handles, rAF 60fps resize, single size registry, aspect lock, Shift/Esc/DblClick/Arrows, ResizeObserver/container-query adaptation, persisted validation)
In progress: None
Known issues: None
Commands: dev=npm.cmd run dev test=npm.cmd test build=npm.cmd run build
Decisions: Single widget registry in client/src/constants/widgetRegistry.ts, pure computeResize & validateWidgetLayout in client/src/utils/geometry.ts, trailing-throttled useContainerWidth hook
