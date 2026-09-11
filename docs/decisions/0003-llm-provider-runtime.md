# Architectural Decision Record: 0003 — LLM Provider Runtime & Streaming Gateway

## Status
Accepted

## Date
2026-09-12

## Context
In Phase 1 and Phase 2, Personal AI Workspace OS created a reliable desktop runtime and a live context engine that maintains a bounded `ContextPayload` (speech transcripts, active foreground application, sensor states). In Phase 3, the workspace needed a clean, provider-agnostic execution gateway to query configurable AI providers (Gemini, OpenAI, Anthropic, and local Ollama) without tightly coupling the desktop runtime to any single vendor SDK or risking uncontrolled automated API query storms.

## Decision
1. **Isolated Provider Gateway Layer (`src/main/providers/`)**:
   - The provider layer lives completely outside the React renderer and operates behind a common contract: `LlmProvider`.
   - Adapters for **Google Gemini**, **OpenAI**, **Ollama**, and **Anthropic** implement `healthCheck()` and `streamResponse()`.
2. **Normalized Context Assembly (`ContextAssembler`)**:
   - Prompts are formulated systematically by combining workspace instructions, active desktop window context, and recent rolling speech transcripts into a normalized prompt structure before reaching provider adapters.
3. **Intentional User-Driven AI Triggers**:
   - Audio and context updates do **not** automatically dispatch LLM requests. AI query execution is triggered explicitly by user intent (e.g. clicking the `[Ask AI]` overlay button or triggering an assigned key combination).
4. **Zero Plaintext Secret Storage**:
   - API keys are held exclusively in protected in-memory structures in the main process (`CredentialStore`) and are never exposed across IPC to renderer windows or written into plaintext SQLite database records.
   - Any error logs originating from network exceptions automatically sanitize recognized API key tokens.
5. **Real-Time Incremental Token Streaming**:
   - Providers yield tokens via HTTP chunked transfer and Server-Sent Events (SSE). The gateway forwards typed events (`llm:chunk`) over IPC directly to the Overlay HUD for immediate token-by-token rendering.

## Consequences
- **Positive**: Support for multi-cloud and local air-gapped inference (Ollama) through a unified API.
- **Positive**: User retains complete control over API billing and execution triggers.
- **Limitations**: Local Ollama requires a running local Ollama instance on `http://127.0.0.1:11434`. Cloud providers require valid user-supplied credentials.

---
**Author**:  
**Kavish Nagpal**  
*Senior Data Engineer & Systems Builder*
