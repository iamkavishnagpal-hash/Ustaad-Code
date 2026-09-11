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

## 3. Telemetry Stream Specifications

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

---

*Authored by: **Kavish Nagpal — Senior Data Engineer***
