# Security Policy: Personal AI Workspace OS

## Threat Model & Core Assumptions

The Personal AI Workspace OS is designed as a local-first desktop layer coordinating user workflows and external AI environments.

### 1. Process Isolation & IPC Security
- **Renderer Sandboxing**: All WebViews and BrowserWindow renderers run with `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.
- **Privileged Preload**: The renderer has zero direct access to Node.js built-ins (`child_process`, `fs`, `net`). It interacts exclusively via typed IPC endpoints registered through `contextBridge.exposeInMainWorld`.
- **Schema Validation**: Every IPC payload received in the main process must pass runtime validation via Zod schemas before interacting with internal subsystems or persistence.

### 2. Desktop Actions & External Sources
- The product **does not** automatically execute arbitrary shell commands proposed by AI models.
- External sources are launched through the operating system default browser handler (`shell.openExternal`) after strict URL scheme validation (`http:`, `https:` only).
- Direct browser DOM injection or automated form filling is strictly avoided to prevent credential sniffing or UI tampering.

### 3. Privacy & Window Display Affinity
- Where configured, the Overlay HUD applies Windows `SetWindowDisplayAffinity` (`WDA_EXCLUDEFROMCAPTURE` / `WDA_MONITOR`).
- **Telemetry Honesty**: The system explicitly reports: *"Capture protection active for supported Windows capture paths"* and does not make misleading claims of absolute invisibility or proctoring bypass.

### 4. Credential Storage & Encryption
- **Windows DPAPI Encryption**: AI Provider credentials (OpenAI, Gemini, Anthropic) and integration tokens are encrypted using Electron's `safeStorage` (backed by Windows Data Protection API - DPAPI) using AES-256 bound to the user's OS credentials.
- **Zero Plaintext Persistence**: API keys are never stored in plaintext SQLite databases, environment dumps, or git repositories.
- **Automated Log Redaction**: Structured logging automatically detects and redacts authorization headers, API keys (`apiKey`, `clientSecret`, `token`), and raw capture streams.
- **Isolated Diagnostic Telemetry**: The diagnostics dashboard surfaces configuration readiness (`CONFIGURED / NOT CONFIGURED`) without disclosing secret strings or values.
