# Data Engineering Pipeline & Telemetry Stream

## 1. Context Stream & Ingestion Architecture

In modern desktop computing, the AI runtime cannot act as an isolated prompt window. It functions as an **edge streaming coordinator** that ingests multi-modal system telemetry, enforces schema integrity, and writes immutable audit logs to local storage.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        INGESTION & SENSING LAYER                       │
├───────────────────┬──────────────────────┬─────────────────────────────┤
│ OS Global Hotkeys │ Active Process / Win │ Privacy / Affinity Masking  │
│ (Raw Hardware Int)│ (Win32 Foreground)   │ (WDA_EXCLUDEFROMCAPTURE)    │
└─────────┬─────────┴──────────┬───────────┴──────────────┬──────────────┘
          │                    │                          │
          ▼                    ▼                          ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      SCHEMA VALIDATION & BUFFER                        │
│          Zod Runtime Contracts (Strict Inbound Boundary)               │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     WORKSPACE RUNTIME STATE MACHINE                    │
│      IDLE ──► ACTIVATING ──► OPENING_SOURCE ──► VERIFYING ──► READY    │
│        ▲                                                         │     │
│        └──────────────────── STOP / ERROR ◄──────────────────────┘     │
└─────────┬────────────────────────┬─────────────────────────┬───────────┘
          │                        │                         │
          ▼                        ▼                         ▼
┌──────────────────┐     ┌──────────────────┐      ┌─────────────────────┐
│  OLTP PERSISTENCE│     │ TELEMETRY BUS    │      │ WORKSPACE VERIFIER  │
│  SQLite (WAL)    │     │ Typed Event Emitter     │ Multi-Stage Check:  │
│  - Workspaces    │     │ IPC Broadcast to │      │ - Schema Integrity  │
│  - Sessions      │     │ Main & HUD Render│      │ - URL Reachability  │
│  - Audit Trails  │     │                  │      │ - Display Affinity  │
└──────────────────┘     └──────────────────┘      └─────────────────────┘
```

---

## 2. Low-Level Data Engineering Principles

### A. ACID-Compliant Write-Ahead Logging (WAL)
Every workspace creation, state mutation, and execution lifecycle produces a structured event recorded in SQLite under `PRAGMA journal_mode = WAL;`.
- **Concurrent Readers & Writers**: Read queries from the UI renderer do not block background state machine updates.
- **Immediate Crash Recovery**: If the OS terminates the process unexpectedly, uncommitted transitions are safely rolled back without database corruption.

### B. Schema Evolution & Migration Strategy
- Workspaces and sessions use strict JSON serialization layers validated against runtime Zod schemas (`SourceSchema`, `ActivationPolicySchema`, `PrivacyConfigSchema`).
- Decouples storage representation from UI components, preventing structural drift across versions.

### C. Zero-Allocation Event Bus
The event streaming layer (`RuntimeEventsBus`) broadcasts typed state snapshots to subscribed WebContents without serializing raw memory handles or sensitive OS descriptors.

---

## 3. Phase 2 Audio Stream & Context Buffer Topology
 
In Phase 2, the telemetry bus is expanded into a dual-channel real-time event pipeline:
 
```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HIGH-FREQUENCY HARDWARE INGESTION LAYER                  │
├─────────────────────────────┬───────────────────────────────────────────────┤
│ Microphone Capture Stream   │ WASAPI System Audio Probe                     │
│ (16kHz PCM mono, 1600-byte) │ (Honest loopback availability verification)   │
└──────────────┬──────────────┴───────────────────────┬───────────────────────┘
               │                                      │
               ▼                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   STT SPEECH-TO-TEXT ADAPTER ENGINE                         │
│   (Local Whisper Engine / Streaming Chunks -> Typed TranscriptSegment)      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│             BOUNDED FIFO SLIDING-WINDOW RING BUFFER (IN-MEMORY)             │
│   - Enforces max retention: 50 segments                                     │
│   - Enforces temporal TTL: 10 minutes sliding window                        │
│   - Enforces character boundary: 8,000 chars                                │
│   - Volatile storage only: Zero audio dumping to disk                       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                 ┌─────────────────────┴─────────────────────┐
                 │                                           │
                 ▼                                           ▼
┌─────────────────────────────────┐       ┌──────────────────────────────────┐
│  ACTIVE OS FOREGROUND PROBE     │       │   DESKTOP OVERLAY HUD STREAM     │
│  Win32 GetForegroundWindow      │       │   Event: context:updated         │
│  - Process Name (e.g. 'Code')   │       │   Event: transcript:chunk        │
│  - Window Title & Target PID    │       │   Event: audio:state-changed     │
└────────────────┬────────────────┘       └──────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      AGGREGATED RUNTIME CONTEXT SNAPSHOT                    │
│   Ready for Phase 3 Local & Cloud AI Provider Dispatch (No Speculation)     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Telemetry Stream Specifications

Each activation produces a `RuntimeSessionRecord`:

```json
{
  "sessionId": "4b638928-1b20-410e-a3cf-eef0142e0915",
  "workspaceId": "3eac04da-a9b9-4dcb-95d4-984935d2ea09",
  "startedAt": 1789096797000,
  "status": "READY",
  "verificationReport": {
    "passed": true,
    "workspaceResolved": true,
    "sourceReachable": true,
    "sourceLaunched": true,
    "overlayMounted": true,
    "privacyPolicyApplied": true,
    "privacyNotice": "Capture protection active for supported Windows capture paths.",
    "errors": []
  }
}
```

And real-time live context queries return an immutable `RuntimeContext` payload:

```json
{
  "sessionId": "4b638928-1b20-410e-a3cf-eef0142e0915",
  "workspaceId": "3eac04da-a9b9-4dcb-95d4-984935d2ea09",
  "transcript": [
    {
      "id": "segment-1789099800000",
      "text": "Reviewing data pipeline ingestion latency and error spikes.",
      "timestamp": 1789099800000,
      "isFinal": true,
      "source": "microphone"
    }
  ],
  "activeApplication": {
    "title": "VS Code - UstaadG Pipeline",
    "processName": "Code",
    "pid": 10420
  },
  "capturedAt": 1789099801000
}
```

---

*Authored by: **Kavish Nagpal — Senior Data Engineer***

