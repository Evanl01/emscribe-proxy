import { z } from 'zod';
import { uuidRegex, isoDatetimeRegex } from '@/src/app/schemas/regex';


export const recordingSchema = z.object({
  id: z.number().int().optional(), // int8 in SQL, optional for auto-increment
  
  created_at: z.string().regex(isoDatetimeRegex, 'Invalid ISO datetime').optional(),
  user_id: z.string().regex(uuidRegex, 'Invalid UUID').optional(),
  name: z.string().optional(),
  audio_file_path: z.string().nullable(), // Path to the audio file, located in Supabase bucket
});