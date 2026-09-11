# Architecture Decision Record (ADR) 0007: Production Hardening, Lifecycle & Windows Release

## Status
**Accepted & Implemented**

## Author
**Kavish Nagpal**  
*Senior Data Engineer & Systems Builder*

## Context
Across Phases 1 through 6, the **Personal AI Workspace OS** evolved through six functional increments:
1. **Workspace Runtime & Hotkey Registration** (Phase 1)
2. **Live Audio & Context Streams** (Phase 2)
3. **Provider Gateway & LLM Streaming HUD** (Phase 3)
4. **Desktop Screen & Vision Context** (Phase 4)
5. **Workflow & Action Automation Engine** (Phase 5)
6. **IT Application Integrations (VS Code, Git, Terminal)** (Phase 6)

While functionally capable, turning this development codebase into a reliable, enterprise-grade Windows desktop application required solving critical production constraints:
- Preventing multiple instances from spawning or competing for hotkeys.
- Ensuring graceful application startup and shutdown across all native subsystems (SQLite, hotkeys, overlays, audio processes, and child handles).
- Protecting sensitive credentials (AI API keys, Git tokens) with OS-level encryption (Windows DPAPI) rather than raw plaintext storage.
- Implementing a Windows system tray lifecycle allowing the application to persist in the background for instant hotkey activation.
- Validating system health and providing user-facing diagnostics without leaking sensitive data.
- Establishing an automated, reproducible Windows installer pipeline (`PersonalAIWorkspaceOS-Setup.exe`).

---

## Architectural Decisions

### 1. Unified Application Lifecycle Manager (`AppLifecycleManager`)
We introduced an explicit state machine for application lifecycle:
```text
STARTING → INITIALIZING → READY → RUNNING → STOPPING → EXITED
```
During shutdown (`gracefulShutdown()`):
1. **Running workflows** receive an immediate cooperative cancellation token.
2. **Audio and context capture runtimes** are deactivated and child processes/listeners terminated.
3. **Global hotkeys** registered with Windows (`RegisterHotKey`) are completely unregistered to prevent orphaned hooks.
4. **Window and Overlay instances** are closed cleanly.
5. **System Tray icon** is destroyed.
6. **SQLite connection pool** writes pending WAL checkpoints and cleanly flushes to disk.
7. Log buffers flush, transitioning the lifecycle to `EXITED`.

### 2. Single-Instance Enforcement
We use Electron's `app.requestSingleInstanceLock()`. If a user attempts to launch a second instance:
- The secondary instance immediately exits without initializing duplicate runtimes.
- The primary instance catches the `second-instance` event, restores the minimized window if necessary, and brings the workspace manager to the foreground.

### 3. Windows-Protected Credential Storage (`safeStorage`)
To protect user API keys and integration tokens against offline inspection or plain-file theft:
- We leverage Electron's `safeStorage` API backed by Windows **DPAPI (Data Protection API)** using AES-256 with the user's logged-in Windows account credentials.
- In headless/CI environments where DPAPI is unavailable, the `CredentialStore` falls back gracefully without crashing.
- Structured logging automatically redacts tokens, secrets, API keys, and authorization headers (`[REDACTED]`).

### 4. Background System Tray Lifecycle (`TrayManager`)
Normal Windows desktop utilities should run unobtrusively:
- When the user closes the main Workspace Manager window, the application remains running in the Windows system notification area (Tray) if `closeToTray` is enabled.
- The tray context menu reflects live state (`Active: <workspace>` vs `Runtime Idle`).
- Users can pause/stop the runtime, reopen the manager, or exit cleanly directly from the tray.
- Double-clicking the tray icon restores the primary workspace dashboard.

### 5. Settings & Windows Startup Persistence (`AppSettingsStore`)
Settings are validated via Zod schemas and stored in `%APPDATA%/settings.json`:
- `startWithWindows`: Controls native Windows login registration via `app.setLoginItemSettings({ openAtLogin, args: ['--hidden'] })`.
- `closeToTray`: Preserves hotkey listeners in the background when the manager window is dismissed.
- `theme`: UI appearance preference.

### 6. Subsystem Health Checks & Diagnostics
A user-facing Diagnostics interface provides actionable visibility into desktop health:
- Node / Electron / Windows versions
- SQLite database status (`CONNECTED`)
- Registered hotkey count and active shortcuts
- Audio context capture state
- Provider credentials configured
- Discovered IT tool integrations (VS Code, Git, Terminal)

### 7. Packaging & Distribution (`electron-builder`)
The application is packaged with `electron-builder` producing:
- `release/PersonalAIWorkspaceOS-Setup.exe` (NSIS installer with customizable directory selection and clean uninstaller preserving user workspace data).
- `release/PersonalAIWorkspaceOS-Portable.exe` (Self-contained portable executable).
- Automated GitHub Actions workflow (`.github/workflows/release.yml`) testing, building, packaging, and archiving artifacts on every release tag.

---

## Consequences & Trade-offs
- **Security**: Provider credentials are now persisted securely on disk with hardware/user DPAPI protection, eliminating the need to re-enter keys on restart.
- **Reliability**: No orphaned hotkeys or unclosed database handles remain on system shutdown or app exit.
- **Windows Integration**: Native tray and login item support match expected Windows OS conventions.
- **Portability**: In non-Windows CI environments, DPAPI and native system tray gracefully use fallback mocks without failing automated tests.
