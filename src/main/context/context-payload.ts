import { z } from 'zod';

export const ContextPayloadSchema = z.object({
  workspaceId: z.string(),
  sessionId: z.string(),
  timestamp: z.number(),

  transcript: z.object({
    text: z.string(),
    startedAt: z.number(),
    updatedAt: z.number(),
    segmentCount: z.number().default(0),
  }),

  activeWindow: z
    .object({
      application: z.string().optional(),
      title: z.string().optional(),
      processId: z.number().optional(),
    })
    .optional(),

  screenContext: z
    .object({
      application: z.string().optional(),
      title: z.string().optional(),
      ocrText: z.string().optional(),
      dimensions: z
        .object({
          width: z.number(),
          height: z.number(),
        })
        .optional(),
      capturedAt: z.number().optional(),
    })
    .optional(),

  sources: z.object({
    microphone: z.boolean(),
    systemAudio: z.boolean(),
    activeWindow: z.boolean(),
    screen: z.boolean(),
  }),
});

export type ContextPayload = z.infer<typeof ContextPayloadSchema>;
