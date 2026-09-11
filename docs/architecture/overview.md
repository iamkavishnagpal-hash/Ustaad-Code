# Architecture Overview: Personal AI Workspace OS

## Core Design Principle
The Workspace is the primary unit of execution. The product is **not** a chat window or a simple URL launcher with an overlay; it is a desktop runtime that manages activation, sessions, privacy boundaries, and verified system status.

```text
[Global Hotkey] (OS Level)
       │
       ▼
[Hotkey Manager] (Conflict detection & event routing)
       │
       ▼
[Workspace Runtime] (State machine: IDLE -> ACTIVATING -> OPENING_SOURCE -> VERIFYING -> READY)
       │
       ├──► [Workspace Service] (Storage lookup & validation)
       ├──► [Session Store] (Records session start/stop in SQLite)
       ├──► [Workspace Launcher] (Validated source launch / focus)
       ├──► [Privacy Manager] (Windows capture protection policy)
       ├──► [Window Manager] (Orchestrates Main Settings & HUD Overlay)
       │
       ▼
[Workspace Verifier] (Inspects launch signal, overlay visibility, privacy policies)
       │
       ▼
[HUD Overlay] (Displays verified state, active workspace, privacy indicators)
```

## Security & IPC Boundaries
- Renderer processes (`main` and `overlay`) run with `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.
- Renderer communicates with Node.js main process exclusively via typed IPC channels defined in `@shared/ipc`.
- All payloads passed across IPC boundaries are validated by Zod schemas before storage or execution.
- No direct shell execution or arbitrary file access is ever exposed to the UI renderer.
