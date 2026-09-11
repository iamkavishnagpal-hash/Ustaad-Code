# Architectural Decision Record: 0002 — Live Context Runtime & Normalized ContextPayload

## Status
Accepted

## Date
2026-09-12

## Context
In Phase 1, Personal AI Workspace OS proved atomic workspace execution on Windows via global hotkeys, state machines, and verified privacy policies. In Phase 2, the product needed the capability to ingest and maintain live desktop context (continuous microphone speech-to-text transcripts and active foreground application snapshots) without prematurely coupling to a specific AI chat provider or cloud API.

## Decision
1. **Separation of Concerns**: We created a dedicated `ContextRuntime` subsystem rather than bloating the `WorkspaceRuntime` or coupling directly to React. The `WorkspaceRuntime` delegates context lifecycle management to `ContextRuntime`.
2. **Normalized `ContextPayload` Contract**: Context is normalized into a strict, validated schema (`ContextPayload`) containing:
   - Identifiers: `workspaceId`, `sessionId`, `timestamp`
   - Bounded Rolling Transcript: Aggregated text, timestamps, segment count
   - Active Application Snapshot: Process name, window title, PID
   - Hardware Source Flags: `microphone`, `systemAudio`, `activeWindow`, `screen`
3. **Local-First Bounded In-Memory Ring Buffer**:
   - Rather than persisting unbounded audio or transcript text in the SQLite database, transcripts are kept in volatile memory using a sliding window ring buffer (`ContextBuffer`).
   - Eviction is enforced across 3 dimensions: TTL duration (10 min), max segments (50), and character budget (10,000 chars).
4. **Adaptive Active Window Probing**:
   - Instead of aggressive millisecond polling that degrades CPU performance, active application discovery utilizes a Windows User32 API probe with a 2-second TTL cache.
5. **Resilient Failure Containment**:
   - A microphone device disconnect or window probe failure emits a recoverable `CONTEXT_ERROR` event without crashing or resetting the active workspace.

## Consequences
- **Positive**: Future AI providers (Phase 3: Gemini, OpenAI, Anthropic, Ollama) can cleanly consume `ContextPayload` through a uniform interface without needing any awareness of audio streams, buffers, or OS window hooks.
- **Positive**: Ephemeral volatile memory avoids unbounded SQLite database bloat and safeguards user privacy by not persisting live speech transcripts to disk.
- **Limitations**: System audio loopback requires elevated Windows WASAPI loopback drivers on some OEM hardware; the system reports loopback unavailability truthfully.

---
**Author**:  
**Kavish Nagpal**  
*Senior Data Engineer & Systems Builder*
