import { RuntimeStateSnapshot, RuntimeStatus, VerificationReport, Workspace } from './types';

export const IPC_CHANNELS = {
  // Workspaces CRUD
  WORKSPACE_LIST: 'workspace:list',
  WORKSPACE_GET: 'workspace:get',
  WORKSPACE_CREATE: 'workspace:create',
  WORKSPACE_UPDATE: 'workspace:update',
  WORKSPACE_DELETE: 'workspace:delete',

  // Hotkey management
  HOTKEY_VALIDATE: 'hotkey:validate',
  HOTKEY_REGISTER: 'hotkey:register',

  // Runtime orchestration
  RUNTIME_GET_STATE: 'runtime:get-state',
  RUNTIME_ACTIVATE_WORKSPACE: 'runtime:activate-workspace',
  RUNTIME_STOP: 'runtime:stop',

  // Live Context & Audio (Phase 2)
  AUDIO_START_LISTENING: 'audio:start-listening',
  AUDIO_STOP_LISTENING: 'audio:stop-listening',
  AUDIO_TOGGLE_MUTE: 'audio:toggle-mute',
  CONTEXT_GET_CURRENT: 'context:get-current',
  CONTEXT_CLEAR: 'context:clear',

  // AI & LLM Provider Gateway (Phase 3)
  LLM_LIST_PROVIDERS: 'llm:list-providers',
  LLM_GET_CONFIG: 'llm:get-config',
  LLM_SAVE_CONFIG: 'llm:save-config',
  LLM_TEST_CONNECTION: 'llm:test-connection',
  LLM_REQUEST_AI: 'llm:request-ai',

  // Workflow & Action Runtime (Phase 5)
  WORKFLOW_LIST: 'workflow:list',
  WORKFLOW_GET: 'workflow:get',
  WORKFLOW_CREATE: 'workflow:create',
  WORKFLOW_UPDATE: 'workflow:update',
  WORKFLOW_DELETE: 'workflow:delete',
  WORKFLOW_RUN: 'workflow:run',
  WORKFLOW_CANCEL: 'workflow:cancel',
  WORKFLOW_GET_AUDIT: 'workflow:get-audit',

  // IT Application Integration Runtime (Phase 6)
  INTEGRATIONS_LIST: 'integrations:list',

  // System Diagnostics & Settings (Phase 7)
  SYSTEM_GET_DIAGNOSTICS: 'system:get-diagnostics',
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',

  // System windows
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_CLOSE: 'window:close',
  OVERLAY_TOGGLE_PIN: 'overlay:toggle-pin',
  OVERLAY_RESIZE: 'overlay:resize',

  // Events (Main -> Renderer)
  EVENT_RUNTIME_STATE_CHANGED: 'event:runtime-state-changed',
  EVENT_HOTKEY_TRIGGERED: 'event:hotkey-triggered',
  EVENT_VERIFICATION_UPDATED: 'event:verification-updated',
  EVENT_TRANSCRIPT_CHUNK: 'event:transcript-chunk',
  EVENT_CONTEXT_UPDATED: 'event:context-updated',
  EVENT_AUDIO_STATE_CHANGED: 'event:audio-state-changed',
  EVENT_LLM_STARTED: 'event:llm-started',
  EVENT_LLM_CHUNK: 'event:llm-chunk',
  EVENT_LLM_COMPLETED: 'event:llm-completed',
  EVENT_LLM_ERROR: 'event:llm-error',

  // Workflow Events
  EVENT_WORKFLOW_STARTED: 'event:workflow-started',
  EVENT_WORKFLOW_STEP_STARTED: 'event:workflow-step-started',
  EVENT_WORKFLOW_STEP_COMPLETED: 'event:workflow-step-completed',
  EVENT_WORKFLOW_COMPLETED: 'event:workflow-completed',
  EVENT_WORKFLOW_FAILED: 'event:workflow-failed',
  EVENT_WORKFLOW_CANCELLED: 'event:workflow-cancelled',
} as const;

export type IpcChannels = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

export interface RuntimeEvents {
  'state:changed': (snapshot: RuntimeStateSnapshot) => void;
  'workspace:activating': (workspace: Workspace) => void;
  'source:opening': (url: string) => void;
  'source:opened': (url: string) => void;
  'verification:completed': (report: VerificationReport) => void;
  'runtime:ready': (workspace: Workspace) => void;
  'runtime:stopped': (sessionId: string) => void;
  'runtime:error': (error: { code: string; message: string }) => void;
}
