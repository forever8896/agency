# Architect Goals

Tasks assigned to the Architect appear here.

---

## DONE: [high] Design Ratatui CLI Application
**Project:** ratatui-cli
**From:** Dispatcher
**Context:** User wants a fun, creative Rust CLI using ratatui. "Surprise me" was requested, so pick something visually impressive and enjoyable. See `projects/ratatui-cli.md` for suggested options.
**Completed:** 2025-12-28

### Deliverables
- [x] Chose **Snake Game** as application concept
- [x] Defined core features: movement, collision, scoring, pause/restart
- [x] Designed 4-module structure: main.rs, app.rs, ui.rs, snake.rs
- [x] Specified keyboard controls (arrows, WASD, vim keys) and UI layout
- [x] Created handoff document: `handoffs/arch-to-dev-ratatui-snake.md`

### Technical Decisions Made
1. **Snake Game** selected for high visual impact, interactivity, and ratatui showcase
2. **crossterm** backend for cross-platform terminal support
3. **VecDeque** for snake body (efficient head/tail operations)
4. **150ms tick rate** for smooth but playable speed
5. **4-file modular structure** for separation of concerns
