import { z } from 'zod'

export const PlatformSchema = z.enum(['twitter', 'linkedin', 'threads'])
export type Platform = z.infer<typeof PlatformSchema>

export const ContentTypeSchema = z.enum(['post', 'reply'])
export type ContentType = z.infer<typeof ContentTypeSchema>

export const PersonaSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  bio: z.string(),
  tone: z.string(),
  topics: z.array(z.string()),
  platform: PlatformSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type Persona = z.infer<typeof PersonaSchema>

export const ContentJobSchema = z.object({
  id: z.string(),
  userId: z.string(),
  platform: PlatformSchema,
  type: ContentTypeSchema,
  personaId: z.string(),
  targetUrl: z.string().optional(), // For replies
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  content: z.string().optional(),
  postedAt: z.date().optional(),
  error: z.string().optional(),
  createdAt: z.date(),
})
export type ContentJob = z.infer<typeof ContentJobSchema>

export const TrackedAccountSchema = z.object({
  id: z.string(),
  userId: z.string(),
  platform: PlatformSchema,
  handle: z.string(),
  name: z.string(),
  category: z.string().optional(),
  enabled: z.boolean().default(true),
  createdAt: z.date(),
})
export type TrackedAccount = z.infer<typeof TrackedAccountSchema>

export const ScheduleConfigSchema = z.object({
  userId: z.string(),
  platform: PlatformSchema,
  postsPerDay: z.number().min(1).max(20),
  repliesPerDay: z.number().min(0).max(50),
  timezone: z.string().default('Asia/Taipei'),
  activeHours: z.object({
    start: z.number().min(0).max(23),
    end: z.number().min(0).max(23),
  }),
})
export type ScheduleConfig = z.infer<typeof ScheduleConfigSchema>
