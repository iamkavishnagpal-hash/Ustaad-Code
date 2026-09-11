import { z } from 'zod';

// Source schema
export const SourceSchema = z.object({
  kind: z.enum(['web', 'api', 'local']),
  provider: z.enum(['chatgpt', 'gemini', 'claude', 'custom', 'ollama']),
  url: z.string().url().optional(),
  endpoint: z.string().url().optional(),
}).refine(data => !!(data.url || data.endpoint), {
  message: 'Either url or endpoint must be provided and valid',
});

// Activation Policy schema
export const ActivationPolicySchema = z.object({
  openSource: z.boolean().default(true),
  focusSource: z.boolean().default(true),
  showOverlay: z.boolean().default(true),
  verifyWindow: z.boolean().default(true),
});

// Privacy Configuration schema (Only verifiable settings for Phase 1)
export const PrivacyConfigSchema = z.object({
  captureProtection: z.boolean().default(false),
  taskbarVisibility: z.enum(['shown', 'hidden']).default('shown'),
  overlayCapturePolicy: z.enum(['normal', 'exclude-when-supported']).default('normal'),
});

// Overlay Display configuration
export const OverlayConfigSchema = z.object({
  alwaysOnTop: z.boolean().default(true),
  opacity: z.number().min(0.2).max(1.0).default(0.92),
  width: z.number().min(280).max(800).default(420),
  position: z.enum(['top-right', 'top-left', 'bottom-right', 'bottom-left', 'custom']).default('top-right'),
});

// Full Workspace schema
export const WorkspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Workspace name is required').max(100),
  description: z.string().max(500).optional().default(''),
  source: SourceSchema,
  activation: ActivationPolicySchema.default({
    openSource: true,
    focusSource: true,
    showOverlay: true,
    verifyWindow: true,
  }),
  hotkey: z.string().min(1, 'Activation hotkey is required'),
  privacy: PrivacyConfigSchema.default({
    captureProtection: false,
    taskbarVisibility: 'shown',
    overlayCapturePolicy: 'normal',
  }),
  overlay: OverlayConfigSchema.default({
    alwaysOnTop: true,
    opacity: 0.92,
    width: 420,
    position: 'top-right',
  }),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// Workspace Input for creation/updates (omits auto fields)
export const WorkspaceInputSchema = WorkspaceSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
