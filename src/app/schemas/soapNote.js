import { z } from 'zod';
import { uuidRegex, isoDatetimeRegex } from '@/src/app/schemas/regex';

export const soapNoteSchema = z.object({
  id: z.number().int().optional(), // int8 in SQL, optional for auto-increment

  created_at: z.string().regex(isoDatetimeRegex, 'Invalid ISO datetime').optional(),
  updated_at: z.string().regex(isoDatetimeRegex, 'Invalid ISO datetime').default(() => new Date().toISOString()).optional(),
  user_id: z.string().regex(uuidRegex, 'Invalid UUID').optional(),
  patientEncounter_id: z.number().int().optional(), // int8 in SQL, optional for auto-increment
  soapNote_text: z.object({
    soapNote: z.object({
      subjective: z.string(),
      objective: z.string(),
      assessment: z.string(),
      plan: z.string(),
    }),
    billingSuggestion: z.object({
      icd10: z.string().optional(),
      cpt: z.string().optional(),
      additional_inquiries: z.string().optional(),
    }).optional(),
  }).nullable() // jsonb, can be more specific if you know the structure
});