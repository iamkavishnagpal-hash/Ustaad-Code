# Personal AI Workspace OS

Personal AI Workspace OS is a Windows-first desktop runtime designed to coordinate desktop workflows with existing AI workspaces (ChatGPT Projects, Claude Projects, Gemini workspaces, or local endpoints).

The core mental model is:

```text
Workspace
    ↓
Activation
    ↓
Context
    ↓
AI
    ↓
Response
    ↓
Optional Action
```

Instead of another chatbot or prompt window, this application provides an OS-level runtime around your knowledge sources.

---

## Architecture Overview

```text
Global Hotkey (OS level)
       ↓
Hotkey Manager (Registers shortcuts, detects conflicts)
       ↓
Workspace Runtime (Finite State Machine: IDLE -> ACTIVATING -> OPENING_SOURCE -> VERIFYING -> READY)
       ↓
Source Launcher (Validates syntax & reachability, opens/focuses source)
       ↓
Runtime Session (Persists sessions in SQLite)
       ↓
Privacy Manager (Honest OS capture policy via SetWindowDisplayAffinity)
       ↓
Workspace Verifier (Validates launch signal, overlay state, and privacy policies)
       ↓
Overlay HUD (Sleek, transparent, always-on-top desktop status bar)
```

---

## Phase 1 Capabilities

* **Workspace Management**: Create, edit, list, and delete workspaces with SQLite persistence.
* **First-Class Sources**: Configure web project URLs (ChatGPT, Claude, Gemini), API endpoints, or local endpoints (Ollama).
* **Global Hotkeys**: Custom global shortcut registration (e.g. `Ctrl + Shift + H`) that triggers workspace activation anywhere across Windows.
* **Lifecycle State Machine**: Explicit transitions: `IDLE` → `ACTIVATING` → `OPENING_SOURCE` → `VERIFYING` → `READY` (with graceful `STOPPING` / `ERROR` paths).
* **Runtime Verification**: `workspace-verifier.ts` checks workspace configuration integrity, reachability, launch execution, and window policy before transitioning to `READY`.
* **Honest Privacy Reporting**: Applies `SetWindowDisplayAffinity` where supported by Windows capture APIs and reports *"Capture protection active for supported Windows capture paths"* without false guarantees.
* **Multi-Window HUD**: Main Workspace Settings window + compact, draggable, non-blocking Overlay HUD.
* **Zero Mock AI**: Does not fake audio capture, transcription, or LLM chat in Phase 1.

---

## Technology Stack

* **Desktop Framework**: Electron 34 + TypeScript
* **UI**: React 18 + TailwindCSS + Lucide Icons
* **Persistence**: SQLite (Local embedded database with WAL mode and schema migrations)
* **Validation**: Zod (IPC payload and schema validation)
* **Bundler & Testing**: Vite 6 + Vitest 3

---

## Getting Started

### Prerequisites

* Windows 10 or Windows 11 (64-bit)
* Node.js v18+ (tested on v24)
* Python 3.10+ (for SQLite runtime integration)

### Installation & Development

1. Clone or navigate to the repository:
   ```bash
   git clone <repo-url>
   cd UstaadG
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run automated tests:
   ```bash
   npm test
   ```

4. Build production bundles (Main process + Renderer):
   ```bash
   npm run build
   ```

5. Run the end-to-end acceptance test:
   ```bash
   npx electron scripts/acceptance-test.js
   ```

6. Launch the desktop application in development mode:
   ```bash
   npm run dev
   ```

---

## Security Model

* **Process Isolation**: All renderers run with `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.
* **Privilege Boundary**: Preload scripts expose strictly whitelisted IPC channels. No direct shell or disk operations are accessible from UI renderers.
* **Schema Validation**: Every IPC message payload is strictly validated using Zod schemas in the main process before execution.

---

## Roadmap

* **Phase 1**: Workspace Runtime & Desktop Foundation ✅
* **Phase 2**: Live Context Runtime (Continuous audio capture, sliding window transcript buffer, active app probe) ✅
* **Phase 3**: AI Provider Runtime (Gemini, Claude, OpenAI, Ollama streaming gateway) ✅
* **Phase 4**: Screen & Vision Context Engine (Event-driven screen capture, Windows OCR) ✅
* **Phase 5**: Workflow Builder & Permission-Checked Action Engine (Condition engine, Action Registry, cancellation) ✅
* **Phase 6**: IT Application Integration Runtime (VS Code, Git, Terminal capability providers & context feeding) ✅

---

## Phase 2: Live Context Stream & Audio Architecture

In Phase 2, the runtime coordinates live audio input and real-time context ingestion without speculative cloud AI dependencies:

```text
               ┌───────────────────────┐
               │    Microphone Source  │ (16kHz 16-bit Mono Chunks)
               └───────────┬───────────┘
                           │
                           ▼
               ┌───────────────────────┐
               │ Transcription Provider│ (Whisper Local / Speech Engine)
               └───────────┬───────────┘
                           │
                           ▼ Transcript Segments
               ┌───────────────────────┐
               │    Transcript Buffer  │ (FIFO Bounded Sliding Window)
               │ (Max 50 Segments, TTL)│
               └───────────┬───────────┘
                           │ + Win32 Foreground Probe (ActiveApplicationDetector)
                           ▼
               ┌───────────────────────┐
               │    Context Manager    │ ──► IPC Broadcast to Overlay HUD
               └───────────────────────┘
```

* **Microphone Capture**: Ingests mono PCM chunks (16kHz, 16-bit signed integer) with automatic silence detection and mute toggle.
* **System Audio Truth**: Honest loopback reporting (`{ available: false, reason: "Requires virtual audio driver or Windows WASAPI loopback capture" }`). Zero fake capture states.
* **Bounded In-Memory Ring Buffer**: Implements an immutable FIFO sliding window retaining a maximum of 50 recent segments (configurable duration / max characters). Raw audio and transcripts are never dumped to persistent disk.
* **Active Application Probe**: Win32 foreground window and process detection (`GetForegroundWindow`, `GetWindowThreadProcessId`) with in-memory TTL caching.
* **Overlay HUD Integration**: Real-time microphone badge (`MIC: ON/OFF`), transcription state, rolling context preview, and instant `[Listen / Stop]` and `[Mute]` controls.

---

## Phase 7: Production Hardening & Windows Release

Phase 7 hardens Personal AI Workspace OS into a dependable, production-ready desktop runtime:
* **Clean Application Lifecycle**: Coordinated state machine (`STARTING` → `INITIALIZING` → `READY` → `RUNNING` → `STOPPING` → `EXITED`). No orphaned processes, dangling hotkeys, or unclosed SQLite handles on exit.
* **Single-Instance Enforcement**: Protects against duplicate instances via Electron `requestSingleInstanceLock()`, focusing and restoring the existing workspace manager on second launch.
* **Windows System Tray**: Minimizes cleanly to the system notification area with dynamic status menus, runtime pause/resume controls, and graceful exit.
* **Windows SafeStorage (DPAPI)**: Provider credentials and API tokens are encrypted with hardware-backed Windows DPAPI encryption on disk with automatic credential redaction in structured logs.
* **Settings & Startup Integration**: User configurable `Start with Windows` via `setLoginItemSettings` and `Close to Tray` behavior.
* **Diagnostics & Health Dashboard**: Dedicated diagnostics modal providing real-time visibility into SQLite WAL status, registered hotkeys, audio capture, provider credentials, and IT tool discovery without exposing secrets.
* **Windows Installer & CI/CD**: Packaged with `electron-builder` into `PersonalAIWorkspaceOS-Setup.exe` (NSIS) and portable executables with automated release pipelines on GitHub Actions.

---

## Engineering Standards

- **State Machine Integrity**: Deterministic bidirectional state transitions (`READY` ⇄ `CAPTURING` ⇄ `TRANSCRIBING` ⇄ `CONTEXT_READY`).
- **Zero Hallucination / No Mock UX**: Telemetry reports actual OS window display affinity, real microphone device states, and truthful system audio availability.
- **Privacy-Preserving Ephemeral Memory**: Audio chunks and rolling transcripts remain strictly in volatile memory. Only structured session metadata is committed to SQLite.
- **ACID Persistence**: Local storage runs in SQLite WAL mode (`journal_mode=WAL`) preventing lock contention between background orchestrators and foreground UI threads.

---

**Kavish Nagpal**  
*Senior Data Engineer & Systems Builder*


