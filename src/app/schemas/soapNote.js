import { z } from 'zod';
import { uuidRegex, isoDatetimeRegex } from '@/src/app/schemas/regex';

export const soapNoteSchema = z.object({
  id: z.number().int().optional(), // int8 in SQL, optional for auto-increment

  created_at: z.string().regex(isoDatetimeRegex, 'Invalid ISO datetime').optional(),
  updated_at: z.string().regex(isoDatetimeRegex, 'Invalid ISO datetime').default(() => new Date().toISOString()).optional(),
  user_id: z.string().regex(uuidRegex, 'Invalid UUID').optional(),
  transcript_id: z.number().int().optional(), // int8 in SQL, optional for auto-increment
  chief_complaint: z.string().nullable(),
  soapNote_text: z.object({
    subjective: z.string(),
    objective: z.string(),
    assessment: z.string(),
    plan: z.string()
  }).nullable() // jsonb, can be more specific if you know the structure
});