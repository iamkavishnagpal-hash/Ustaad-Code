# Changelog

All notable changes to Personal AI Workspace OS will be documented in this file.

## [0.1.0] - 2026-09-11

### Added
- **Phase 1 Workspace Runtime Foundation**:
  - Global hotkey management (`src/main/hotkeys/hotkey-manager.ts` and accelerator normalizer).
  - Explicit finite state machine (`src/main/runtime/runtime-state.ts`): `IDLE` → `ACTIVATING` → `OPENING_SOURCE` → `VERIFYING` → `READY`.
  - Workspace verification engine (`src/main/workspaces/workspace-verifier.ts`) ensuring source reachability, launch execution, overlay mounting, and privacy application.
  - Windows window capture exclusion via `SetWindowDisplayAffinity` in `src/main/privacy/privacy-manager.ts`.
  - ACID-compliant SQLite persistence for workspaces and runtime session tracking in `src/main/storage/`.
  - Secure IPC bridge with Zod schema validation on all inputs.
  - React 18 + TailwindCSS Main Workspace Manager UI with hotkey recorder and workspace CRUD.
  - Compact, draggable, transparent Overlay HUD UI displaying real runtime state, active workspace, and verified privacy status.
  - Automated unit test suite and end-to-end Electron acceptance test (`scripts/acceptance-test.js`).
