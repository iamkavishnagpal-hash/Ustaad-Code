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

## Phase 2: Live Context Subsystem

```text
               WORKSPACE RUNTIME
                      │
                      ▼
               CONTEXT RUNTIME
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
       Speech     Active App    Future
       Source      Source       Sources
          │           │
          └───────────┼───────────┘
                      ▼
                Context Buffer (FIFO & TTL Bounded)
                      │
                      ▼
                ContextPayload
                      │
                      ▼
               Future AI Layer
```

### Context Pipeline Responsibilities
1. **Context Runtime (`src/main/context/context-runtime.ts`)**:
   - Manages live context session lifecycle (`startContext`, `stopContext`, `startAudioCapture`).
   - Polls active window changes via Win32 User32 API with adaptive caching.
2. **Multi-Source Context Buffer (`src/main/context/context-buffer.ts`)**:
   - Maintains a bounded FIFO sliding window ring buffer in volatile memory.
   - Enforces time-based eviction (default 10 minutes), count bounds (default 50 segments), and total character budget (default 10,000 characters).
3. **Normalized ContextPayload (`src/main/context/context-payload.ts`)**:
   - Provides a clean, provider-neutral data contract consumed by future AI providers:
     - `workspaceId`, `sessionId`, `timestamp`
     - `transcript`: aggregated text, timestamps, segment count
     - `activeWindow`: foreground window title, process name, PID
     - `sources`: truthful hardware/sensor flags (`microphone`, `systemAudio`, `activeWindow`, `screen`)
4. **Resilient Error Containment**:
   - A microphone device or window probe error dispatches a recoverable `CONTEXT_ERROR` event and does not crash the active workspace runtime.

## Security & IPC Boundaries
- Renderer processes (`main` and `overlay`) run with `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.
- Renderer communicates with Node.js main process exclusively via typed IPC channels defined in `@shared/ipc`.
- All payloads passed across IPC boundaries are validated by Zod schemas before storage or execution.
- No direct shell execution or arbitrary file access is ever exposed to the UI renderer.

---
**Author**:
**Kavish Nagpal**  
*Senior Data Engineer & Systems Builder*

