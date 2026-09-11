# Architectural Decision Record: 0006 — IT Application Integration Runtime

## Status
Accepted

## Date
2026-09-12

## Context
In Phases 1 through 5, Personal AI Workspace OS created:
1. Workspace Runtime & Hotkey Orchestrator (Phase 1)
2. Live Audio & Context Runtime with Ring Buffers (Phase 2)
3. Multi-Provider AI Gateway with Streaming Responses (Phase 3)
4. Screen & Vision Context Runtime with Event-Driven OCR (Phase 4)
5. Workflow & Action Runtime with Condition Engine and Security Policies (Phase 5)

In Phase 6, developers and IT engineers required their desktop workflows to interact safely with external desktop applications (VS Code, Windows Terminal / PowerShell, and Git) without polluting the core workflow runtime with application-specific details or creating unsafe shell injection pathways.

## Key Architectural Decisions

1. **Separation of Integrations from Workflow Engine**:
   - The Workflow Runtime remains completely application-agnostic.
   - Flow:
     ```text
     Workflow Runtime
            ↓
     Action Registry
            ↓
     Integration Registry
            ↓
     Application Adapter (VS Code / Terminal / Git)
            ↓
     External Desktop Target
     ```

2. **Explicit Capability Model**:
   - Each integration is a `DesktopIntegration` implementing explicit capabilities (`getCapabilities()`):
     - **VS Code**: `OPEN`, `FOCUS`, `OPEN_FILE`, `OPEN_FOLDER`. Dispatched via standard CLI arguments rather than fragile GUI pixel automation.
     - **Terminal**: `OPEN`, `FOCUS`. Launches Windows Terminal (`wt.exe`) with graceful fallback to `powershell.exe`. Arbitrary shell commands are prohibited as standard actions.
     - **Git**: `GET_STATUS`, `GET_CURRENT_BRANCH`, `GET_DIFF`. Strictly inspects local repositories through structured output parsers (`--porcelain=v1`, `--shortstat`), rejecting unvalidated input.

3. **Structured Context Re-entry**:
   - Structured data returned by integration actions (e.g. Git status, branch name, diff stats) feeds directly into `ContextBuffer` (`setGitContext`), augmenting `ContextPayload`.
   - `ContextAssembler` automatically formats structured repository context into prompt instructions for AI providers during subsequent `REQUEST_AI_RESPONSE` steps.

4. **Dynamic Availability Detection**:
   - Each integration implements `isAvailable(): Promise<boolean>`.
   - The main process checks availability at runtime and exposes it over IPC (`integrations:list`).
   - Workflows fail cleanly with an understandable `IntegrationNotAvailableError` if a required application is not present.

5. **Security Boundaries & Permission Policy**:
   - Actions are explicitly mapped to `SAFE` in `ActionPolicy`.
   - Arbitrary shell commands or dynamic scripts (`EXECUTE_COMMAND`, `eval`) are classified as `RESTRICTED` and strictly blocked from workflow automation.

## Consequences
- **Positive**: Clean architectural boundary between desktop workflow orchestration and external IT tooling.
- **Positive**: Automated workflows can inspect Git status and open files in VS Code safely without requiring administrative elevation or arbitrary command execution.
- **Positive**: Zero regression in Phases 1–5 test suites; mockable in CI without requiring target applications.

---
**Author**:  
**Kavish Nagpal**  
*Senior Data Engineer & Systems Builder*
