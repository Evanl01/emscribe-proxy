import { z } from 'zod';
import { uuidRegex, isoDatetimeRegex } from '@/src/app/schemas/regex';

// Request schemas - what the API client sends
// These are separate from database schemas to decouple API contracts from DB schema

export const patientEncounterCreateRequestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  recording_file_path: z.string().min(1, 'Recording file path is required'),
  recording_file_signed_url: z.string().nullable().optional(),
  recording_file_signed_url_expiry: z.string().regex(isoDatetimeRegex, 'Invalid ISO datetime').nullable().optional(),
});

/**
 * PATCH request for patient encounter - only updates the encounter itself (e.g., name)
 * Use PATCH /api/patient-encounters/{id}/update-with-transcript for compound updates
 */
export const patientEncounterUpdateRequestSchema = z.object({
  id: z.number().int('ID must be an integer'),
  name: z.string().min(1, 'Name is required').optional(),
});

/**
 * PATCH request for transcript-only updates
 * Endpoint: PATCH /api/patient-encounters/{id}/transcript
 */
export const transcriptUpdateRequestSchema = z.object({
  transcript_text: z.string().min(1, 'Transcript text is required'),
});

/**
 * PATCH request for compound updates (name + transcript)
 * Endpoint: PATCH /api/patient-encounters/{id}/update-with-transcript
 * Both fields are optional to allow partial updates
 */
export const patientEncounterWithTranscriptUpdateRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  transcript_text: z.string().min(1, 'Transcript text is required').optional(),
}).refine(
  (data) => data.name !== undefined || data.transcript_text !== undefined,
  { message: 'At least one of name or transcript_text must be provided' }
);

/**
 * Schema for the transformed data before database operations
 * This is what gets validated before saving to DB
 */
export const patientEncounterForDatabaseSchema = z.object({
  id: z.number().int().optional(),
  encrypted_name: z.string().nullable().optional(),
  recording_file_path: z.string().nullable().optional(),
  recording_file_signed_url: z.string().nullable().optional(),
  recording_file_signed_url_expiry: z.string().regex(isoDatetimeRegex, 'Invalid ISO datetime').nullable().optional(),
  encrypted_aes_key: z.string().nullable().optional(),
  iv: z.string().nullable().optional(),
  user_id: z.string().regex(uuidRegex, 'Invalid UUID').nullable().optional(),
});

export const transcriptForDatabaseSchema = z.object({
  id: z.number().int().optional(),
  recording_id: z.number().int().optional(),
  patientEncounter_id: z.number().int().optional(),
  encrypted_transcript_text: z.string().nullable(),
  iv: z.string().nullable().optional(),
  user_id: z.string().regex(uuidRegex, 'Invalid UUID').optional(),
});
