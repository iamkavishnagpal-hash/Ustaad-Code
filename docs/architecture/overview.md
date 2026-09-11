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

## Phase 3: LLM Provider Gateway & Runtime

```text
               ContextPayload (Phase 2)
                      │
                      ▼
               ContextAssembler (Prompt Formulation)
                      │
                      ▼
               Provider Gateway (`src/main/providers/provider-gateway.ts`)
                      │
       ┌──────────────┼──────────────┬──────────────┐
       ▼              ▼              ▼              ▼
 Google Gemini     OpenAI      Ollama (Local)   Anthropic
  SSE Stream     SSE Stream      NDJSON Stream  SSE Stream
       │              │              │              │
       └──────────────┴──────────────┴──────────────┘
                      │
                      ▼ (Tokens & Lifecycle Events)
               RuntimeEventsBus
                      │
                      ▼
             Desktop Overlay HUD (Live Typing Cursor)
```

### Provider Subsystem Responsibilities
1. **Provider Gateway (`src/main/providers/provider-gateway.ts`)**:
   - Manages connection tests (`healthCheck`) and streaming execution pipelines.
   - Forwards incremental token deltas over IPC without buffering the full response.
2. **Provider Adapters (`src/main/providers/adapters/`)**:
   - Normalized adapters for **Gemini**, **OpenAI**, **Ollama**, and **Anthropic** implementing the common `LlmProvider` contract.
3. **Secure Credential Store (`src/main/storage/credential-store.ts`)**:
   - API keys are held exclusively in protected main process memory; never leaked into SQLite plaintext or React renderers.
4. **Context Assembly (`src/main/providers/context-assembler.ts`)**:
   - Combines workspace instructions, foreground application state, and recent speech transcripts into clean, structured prompts.

## Phase 4: Screen & Vision Context Subsystem

```text
         Windows Active Window Detector (User32 Signal)
                      │ (Trigger on Change)
                      ▼
         ScreenContextSource (`src/main/context/screen/screen-source.ts`)
                      │
                      ├──► ScreenCaptureService (desktopCapturer / bounded resolution)
                      └──► WindowsOcrEngine (Visual text & heuristics extraction)
                                    │
                                    ▼
                         ContextBuffer (`screenContext`)
                                    │
                                    ▼
                         ContextPayload & Assembler
                                    │
                                    ▼
                         AI Provider Gateway
```

### Screen Context Responsibilities
1. **Screen Context Source (`src/main/context/screen/screen-source.ts`)**:
   - Change-driven capture policy governed by foreground application changes and a conservative 5-second interval throttle.
2. **Screen Capture Service (`src/main/context/screen/screen-capture.ts`)**:
   - Captures primary display thumbnail buffers safely using bounded resolution to prevent RAM bloat.
3. **Provider-Neutral OCR Engine (`src/main/context/screen/ocr-engine.ts`)**:
   - Extracts structured visual text without vendor lock-in.
4. **ContextPayload Integration**:
   - Ingests `screenContext` (`application`, `title`, `ocrText`, `dimensions`) into `ContextPayload` for AI prompt augmentation.

## Phase 5: Workflow & Action Runtime Subsystem

```text
               Global Hotkey / Manual Overlay Action
                                │
                                ▼
                   WorkflowRuntime (`src/main/workflows/workflow-runtime.ts`)
                                │
                                ├──► Condition Evaluator (app, title, workspace state)
                                │       │ (Fails safely if condition false)
                                │       ▼
                                ├──► Sequential Step Pipeline
                                │       │
                                │       ├──► ActionPolicy (SAFE, USER_CONFIRMATION, RESTRICTED)
                                │       ├──► ActionRegistry (Handler lookup & validation)
                                │       └──► Timeout Guard & AbortController Signal
                                │
                                ├──► Action Execution (OPEN_URL, OPEN_APPLICATION, SHOW_OVERLAY,
                                │                      START_CONTEXT, STOP_CONTEXT, REQUEST_AI_RESPONSE)
                                │
                                ├──► Lightweight Audit Log (SQLite `workflows` table)
                                │
                                ▼
                       Desktop HUD Overlay (Live progress banner & cancel button)
```

### Workflow Subsystem Responsibilities
1. **Workflow Runtime (`src/main/workflows/workflow-runtime.ts`)**:
   - Manages workflow execution lifecycle (`IDLE`, `RUNNING`, `WAITING`, `COMPLETED`, `FAILED`, `CANCELLED`).
   - Supports per-step timeouts, cooperative cancellation tokens, and sequential step progression.
2. **Condition Evaluator**:
   - Evaluates active desktop conditions (`active-application`, `window-title`, `workspace-state`) using declarative operators (`equals`, `contains`, `not-equals`).
3. **Action Registry & Policy (`src/main/workflows/action-registry.ts`, `action-policy.ts`)**:
   - Registry for known, safe actions.
   - Enforces strict permission levels: `SAFE` allowed, `USER_CONFIRMATION` requiring elevated prompt, and `RESTRICTED` (such as arbitrary shell commands) denied by policy.
4. **Overlay HUD Workflow Banner**:
   - Displays real-time step execution (`Step X of Y: ACTION`), success banners, failure notifications, and a direct cancellation action.

## Phase 6: IT Application Integration Runtime Subsystem

```text
       Workflow Runtime
              │
              ▼
       Action Registry
              │
              ▼
    Integration Registry (`src/main/integrations/integration-registry.ts`)
              │
      ┌───────┼───────┐
      ▼       ▼       ▼
   VS Code Terminal  Git
      │       │       │
      ▼       ▼       ▼
  Desktop Applications on Windows
              │ (Structured Data: Branch, Status, Diff)
              ▼
        ContextBuffer (`setGitContext`)
              │
              ▼
        ContextPayload & ContextAssembler
              │
              ▼
     AI Provider Response
```

### Integration Subsystem Responsibilities
1. **Integration Registry (`src/main/integrations/integration-registry.ts`)**:
   - Manages desktop tool integrations, dynamic discovery, and capability checking.
2. **VS Code Adapter (`src/main/integrations/vscode/vscode-integration.ts`)**:
   - Capabilities: `OPEN`, `FOCUS`, `OPEN_FOLDER`, `OPEN_FILE`. Invokes official CLI without fragile GUI pixel coordinates.
3. **Terminal Adapter (`src/main/integrations/terminal/terminal-integration.ts`)**:
   - Capabilities: `OPEN`, `FOCUS`. Spawns `wt.exe` with PowerShell fallback.
4. **Git Adapter (`src/main/integrations/git/git-integration.ts`)**:
   - Capabilities: `GET_STATUS`, `GET_CURRENT_BRANCH`, `GET_DIFF`. Performs structured parsing of repository state.
5. **Context Augmentation**:
   - Ingests structured repository telemetry directly into `ContextPayload` so subsequent AI steps have live git awareness.

## Security & IPC Boundaries
- Renderer processes (`main` and `overlay`) run with `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.
- Renderer communicates with Node.js main process exclusively via typed IPC channels defined in `@shared/ipc`.
- All payloads passed across IPC boundaries are validated by Zod schemas before storage or execution.
- No direct shell execution or arbitrary file access is ever exposed to the UI renderer.

---
**Author**:
**Kavish Nagpal**  
*Senior Data Engineer & Systems Builder*




