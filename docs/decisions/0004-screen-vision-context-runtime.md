# Architectural Decision Record: 0004 — Screen & Vision Context Runtime

## Status
Accepted

## Date
2026-09-12

## Context
In Phases 1 through 3, Personal AI Workspace OS created a robust desktop runtime, audio speech-to-text context engine, and streaming multi-provider AI gateway. In Phase 4, the workspace required screen and visual context awareness to understand the user's current visible workflow (e.g. open editor, terminal, browser, or cloud console) without continuous high-frequency video capture or heavy computer vision loops that cause thermal/CPU spikes.

## Decision
1. **Change-Driven Capture Policy (`ScreenContextSource`)**:
   - Rather than streaming 30/60 FPS frames, screen context capture is triggered **on change** when the active foreground application or window title changes, governed by a conservative rate-limiting throttle (default 5 seconds).
   - Reuses the existing lightweight Win32 `ActiveApplicationDetector` as the primary change signal.
2. **Provider-Neutral OCR Abstraction (`OcrEngine`)**:
   - Defined a provider-neutral interface `OcrEngine` implemented by `WindowsOcrEngine`.
   - Extracts structured textual context from visible display sources without forcing vendor lock-in.
3. **Bounded Visual Resolution**:
   - Uses Electron's `desktopCapturer` with bounded thumbnail sizes (e.g. 1280x720) to prevent RAM inflation and memory leaks.
4. **Normalized ContextPayload Integration**:
   - Extended `ContextPayload` and `ContextBuffer` with `screenContext`:
     - `application`, `title`, `ocrText`, `dimensions`, `capturedAt`
   - `ContextAssembler` injects visible screen context directly into the prompt sent to AI providers (Gemini, OpenAI, Ollama, Anthropic).
5. **HUD Telemetry**:
   - The Desktop Overlay HUD displays truthful `SCR: ON/OFF` telemetry reflecting whether the visual sensor subsystem is actively monitoring.

## Consequences
- **Positive**: Low idle CPU and memory consumption. Screenshots are processed on demand and never permanently stored on disk.
- **Positive**: AI responses are now contextually aware of both what the user is saying (speech) and what they are seeing (screen).

---
**Author**:  
**Kavish Nagpal**  
*Senior Data Engineer & Systems Builder*
