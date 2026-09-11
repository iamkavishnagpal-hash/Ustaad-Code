# ADR 0001: Desktop Runtime Architecture & State Machine

## Context
We need a Windows-first desktop layer capable of coordinating global hotkeys, window management, persistent workspace configuration, and an always-on-top HUD overlay.

## Decision
1. **Desktop Shell**: Use Electron + React + TypeScript + Vite. This provides native Windows window management, OS global shortcuts, transparent click-through windows, and seamless bundling for Windows 10/11.
2. **Modular Architecture**: Separate runtime into distinct modules:
   - `runtime/`: State machine, lifecycle orchestrator, event bus.
   - `workspaces/`: Validation (Zod), lookup, source launcher, verification.
   - `hotkeys/`: OS global shortcut binding and conflict resolution.
   - `windows/`: Main window & overlay HUD controllers.
   - `privacy/`: OS capture policy enforcement and honest telemetry.
   - `storage/`: SQLite via `better-sqlite3`.
3. **State Machine**:
   - `IDLE`: No active workspace.
   - `ACTIVATING`: Hotkey resolved, session created in DB.
   - `OPENING_SOURCE`: Launching browser or target source.
   - `VERIFYING`: Running verification checks across source, overlay, and privacy policy.
   - `READY`: Verified operational state shown on HUD.
   - `STOPPING`: Session termination requested.
   - `ERROR`: Specific failure reason communicated to user.

## Consequences
- Clean decoupling between desktop orchestrator and future capabilities (audio, screen, AI).
- No mock UI or dead settings in Phase 1.
