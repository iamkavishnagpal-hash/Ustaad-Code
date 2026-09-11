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
* **Phase 2**: Audio Runtime (Microphone, system audio, local Whisper STT)
* **Phase 3**: AI Provider Runtime (Gemini, Claude, OpenAI, Ollama adapters & streaming)
* **Phase 4**: Screen & Context Engine (Selective window capture, active application detection)
* **Phase 5**: Workflow Builder & Permission-Checked Action Engine
* **Phase 6**: IT Workflows & Tooling Integrations (VS Code, Git, Terminal)

---

## Engineering Standards

- **State Machine Integrity**: Deterministic sequential state transitions (`IDLE` → `ACTIVATING` → `OPENING_SOURCE` → `VERIFYING` → `READY`).
- **Zero Hallucination / No Mock UX**: Telemetry reports actual OS window display affinity and real reachability tests.
- **ACID Persistence**: Local storage runs in SQLite WAL mode (`journal_mode=WAL`) preventing lock contention between background orchestrators and foreground UI threads.

---

**Kavish Nagpal**  
*Senior Data Engineer*
