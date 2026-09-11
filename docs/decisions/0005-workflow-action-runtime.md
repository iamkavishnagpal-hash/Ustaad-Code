# Architectural Decision Record: 0005 — Workflow & Action Runtime

## Status
Accepted

## Date
2026-09-12

## Context
In Phases 1 through 4, Personal AI Workspace OS created:
1. Workspace Runtime & Hotkey Orchestrator (Phase 1)
2. Live Audio & Context Runtime with Ring Buffers (Phase 2)
3. Multi-Provider AI Gateway with Streaming Responses (Phase 3)
4. Screen & Vision Context Runtime with Event-Driven OCR (Phase 4)

In Phase 5, the system required the next logical desktop OS capability: **repeatable desktop workflows**.
A desktop workflow belongs to a workspace and executes a sequence of validated actions upon triggering, governed by condition evaluations, explicit permission boundaries, per-step timeouts, and cooperative cancellation.

## Core Architectural Invariants
1. **Separation of Workflows & Workspace State**:
   - Workspaces remain `READY` while associated workflows transition through explicit lifecycle states: `IDLE`, `RUNNING`, `WAITING`, `COMPLETED`, `FAILED`, and `CANCELLED`.
2. **Deterministic Trigger & Condition Resolution**:
   - Triggers: Global Windows Hotkeys (via unified `HotkeyManager`) and Manual Overlay actions.
   - Conditions: Evaluated safely against runtime state (`active-application`, `window-title`, `workspace-state`). If conditions evaluate to false, execution fails safely without crashing the runtime.
3. **Action Registry & Security Policy**:
   - No arbitrary shell execution or dynamic `eval()`.
   - Actions are registered in `ActionRegistry` (`OPEN_URL`, `OPEN_APPLICATION`, `SHOW_OVERLAY`, `HIDE_OVERLAY`, `START_CONTEXT`, `STOP_CONTEXT`, `REQUEST_AI_RESPONSE`).
   - Every action has an explicit permission classification (`SAFE`, `USER_CONFIRMATION`, `RESTRICTED`).
4. **Execution Context & Cancellation**:
   - Actions receive a minimized `ActionExecutionContext` (`workspaceId`, `sessionId`, `activeApplication`, `variables`). Raw Electron internals are never exposed.
   - Workflows feature per-step configurable timeouts and cooperative `AbortController` cancellation (`cancelWorkflow()`).
5. **Context & Provider Independence**:
   - Workflows consume current live `ContextPayload` directly from `WorkspaceRuntime` and invoke `ProviderGateway` through clean abstraction rather than direct API calls.
6. **Persistence & Auditing**:
   - Workflows are stored in SQLite in the `workflows` table via `WorkflowStore`.
   - Lightweight execution metadata is audited without logging raw screen or audio artifacts.
7. **HUD Overlay Integration**:
   - HUD banner visualizes step-by-step progress, completion, failure reasons, and provides an immediate one-click cancellation button.

## Consequences
- **Positive**: Workflows are safe, deterministic, fully cancellable, and bounded by clear permissions.
- **Positive**: Full backwards compatibility with Phases 1–4; no regressions introduced.
- **Positive**: Rich visual HUD telemetry and full CRUD settings interface.

---
**Author**:  
**Kavish Nagpal**  
*Senior Data Engineer & Systems Builder*
