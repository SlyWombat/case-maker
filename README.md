# Case Maker

A web-based Single Page Application for designing custom 3D-printable enclosures for microcontrollers and single-board computers (ESP32, Arduino, Raspberry Pi, custom boards). Generates production-ready STL and 3MF files for slicers — fully client-side, no backend. Also ships as a Windows desktop app.

See [docs/casemaker.md](docs/casemaker.md) for the original design brief.

## Status

**Phase 4 shipped.** Custom-board editor (clone-built-in-then-edit pattern), external STL import (reference visibility), heat-set insert variants (M2.5 / M3 / pass-through / self-tap) with auto-sized boss outer diameter, hex ventilation pattern alongside slots. Plus everything from Phases 1-3.

## Stack

- **TypeScript (strict)** + React 19 + Vite 8
- **three.js** + `@react-three/fiber` + `@react-three/drei` — 3D viewport (Z-up coordinate frame)
- **Manifold-3d** (WASM) — CSG geometry, runs in a Web Worker
- **Zustand** + Immer — state
- **Comlink** — typed worker RPC
- **fflate** — 3MF zip writer
- **Tauri 2** — Windows/macOS/Linux desktop wrapper (~5MB installer, uses Windows WebView2)
- **Vitest** — unit tests
- **Playwright** — E2E with deterministic test mode and `window.__caseMaker` API

## Layout

The app lives in [`casemaker-app/`](./casemaker-app). Architecture rule: the parametric `Project` (JSON in the store) is the single source of truth; the rendered scene is derived state, recomputed in the geometry worker on every change.

## Run

```bash
cd casemaker-app
npm ci
npm run dev          # Vite dev server (http://localhost:5173)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm test             # vitest unit tests
npm run test:e2e     # playwright E2E
npm run build        # production web bundle
npm run tauri:dev    # desktop app dev (requires Rust toolchain)
npm run tauri:build  # native installer (requires Rust toolchain)
```

## Windows installer

Don't have Rust locally? Push to `main` (or trigger the workflow manually) and grab the `.msi` / `.exe` from the **Windows installer** workflow's artifacts on GitHub Actions.

## Coverage

- 42 Vitest unit tests (compiler math, board zod schema, STL/3MF writers, port cutouts/factory, joint compilation, persistence round-trip + version rejection, custom-board editor guards, heat-set insert resolver, hex vs slot ventilation, STL parser round-trip)
- 19 Playwright E2E tests (boot, board load, board swap across all 5 boards, parameter sensitivity, port cutout toggle, STL/3MF round-trips, snap-fit / sliding lid bbox checks, ventilation cutout, project save/load round-trip with mesh-stat restore, undo/redo restoration, clone-and-edit custom board, add mounting hole, STL asset import)

## Roadmap

- **Phase 1 ✓:** Pi 4B tray + flat lid + STL/3MF export
- **Phase 2 ✓:** all 5 built-in boards, automatic port cutouts, per-port toggles, Windows installer via Tauri
- **Phase 3 ✓:** snap-fit + sliding + screw-down joint types (UI selector), ventilation slots, project save/load with zod validation, undo/redo (Ctrl+Z / Ctrl+Shift+Z)
- **Phase 4 ✓:** custom-board editor UI (clone built-in → edit dims + holes), external STL import (reference visibility), heat-set insert variants with auto-sized bosses, hex ventilation pattern
- **Phase 5 (next):** STL/3MF subtract/union geometry pipeline (currently reference-only), 3MF asset import, ASCII STL parsing, component editor UI for custom boards (port positions), snap-fit physical print validation iteration
