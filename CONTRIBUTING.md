# Contributing to Personal AI Workspace OS (UstaadG)

Thank you for your interest in contributing to Personal AI Workspace OS!

## Architectural Principles

1. **Windows-First Reliability**: Workspaces are the atomic unit of execution.
2. **Explicit Finite State Machine**: Runtime states transition strictly through `IDLE -> ACTIVATING -> OPENING_SOURCE -> VERIFYING -> READY` (and audio extensions `CAPTURING -> TRANSCRIBING -> CONTEXT_READY`).
3. **No Unrestricted Renderer Privileges**: Context isolation is strictly enforced. Native calls stay in the main process behind validated IPC channels.
4. **Local SQLite Persistence**: Configurations and execution sessions are persisted in local SQLite with schema validation via Zod.

## Development Workflow

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Run tests to ensure all unit and integration suites pass:
   ```bash
   npm test
   ```

3. Launch development environment:
   ```bash
   npm run dev
   ```

4. Build production bundles:
   ```bash
   npm run build
   ```

## Coding Conventions

- TypeScript strict mode enabled across both main and renderer processes.
- Do not expose native window or OS handles to renderers.
- Always include automated tests for newly introduced state transitions or storage operations.
