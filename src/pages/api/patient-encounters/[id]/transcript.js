import { getSupabaseClient } from '@/src/utils/supabase';
import { authenticateRequest } from '@/src/utils/authenticateRequest';
import { transcriptUpdateRequestSchema } from '@/src/app/schemas/requests';
import { getPatientEncounterWithDecryptedKey } from '@/src/utils/patientEncounterUtils';
import * as encryptionUtils from '@/src/utils/encryptionUtils';

const patientEncounterTable = 'patientEncounters';
const recordingTable = 'recordings';
const transcriptTable = 'transcripts';

export default async function handler(req, res) {
    const supabase = getSupabaseClient(req.headers.authorization);
    const { user, error: authError } = await authenticateRequest(req);
    if (authError) return res.status(401).json({ error: authError });

    const { id: patientEncounterId } = req.query;

    if (!patientEncounterId || isNaN(patientEncounterId)) {
        return res.status(400).json({ error: 'Valid Patient Encounter ID is required' });
    }

    // PATCH /api/patient-encounters/{id}/transcript
    if (req.method === 'PATCH') {
        try {
            console.log('Received PATCH /patient-encounters/:id/transcript request with body:', req.body);
            
            // Validate the request shape
            const parseResult = transcriptUpdateRequestSchema.safeParse(req.body);
            if (!parseResult.success) {
                return res.status(400).json({ error: parseResult.error });
            }
            console.log('Parsed transcript update request:', parseResult.data);
            
            const { transcript_text } = parseResult.data;
            
            // Step 1: Fetch patient encounter with decrypted AES key
            const encounterResult = await getPatientEncounterWithDecryptedKey(supabase, patientEncounterId);
            if (!encounterResult.success) {
                return res.status(encounterResult.statusCode).json({ error: encounterResult.error });
            }
            
            const { data: patientEncounter, aes_key, iv } = encounterResult;
            
            if (!patientEncounter.recording_id) {
                return res.status(400).json({ error: 'Patient encounter has no associated recording' });
            }
            
            // Step 2: Get AES key for encryption
            const encrypted_transcript_text = encryptionUtils.encryptText(transcript_text, aes_key, iv);
            
            // Step 3: Check if transcript exists for this recording
            const { data: existingTranscript, error: fetchTranscriptError } = await supabase
                .from(transcriptTable)
                .select('id')
                .eq('recording_id', patientEncounter.recording_id)
                .single();
            
            let updateResult = null;
            let updateError = null;
            
            if (fetchTranscriptError && fetchTranscriptError.code !== 'PGRST116') {
                // PGRST116 means no rows found (which is ok)
                return res.status(500).json({ error: 'Failed to query transcript: ' + fetchTranscriptError.message });
            }
            
            if (existingTranscript) {
                // Step 4a: Update existing transcript
                console.log('Updating existing transcript with id:', existingTranscript.id);
                ({ data: updateResult, error: updateError } = await supabase
                    .from(transcriptTable)
                    .update({
                        encrypted_transcript_text,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', existingTranscript.id)
                    .select()
                    .single());
                
                if (updateError) {
                    return res.status(500).json({ error: 'Failed to update transcript: ' + updateError.message });
                }
            } else {
                // Step 4b: Create new transcript
                console.log('Creating new transcript for recording_id:', patientEncounter.recording_id);
                ({ data: updateResult, error: updateError } = await supabase
                    .from(transcriptTable)
                    .insert({
                        recording_id: patientEncounter.recording_id,
                        encrypted_transcript_text,
                        iv,
                        user_id: user.id,
                    })
                    .select()
                    .single());
                
                if (updateError) {
                    return res.status(500).json({ error: 'Failed to create transcript: ' + updateError.message });
                }
            }
            
            console.log('Transcript update successful:', updateResult);
            return res.status(200).json({ success: true, data: updateResult });
        }
        catch (err) {
            console.error('PATCH /patient-encounters/:id/transcript error:', err);
            return res.status(500).json({ error: err.message });
        }
    }

    // GET /api/patient-encounters/{id}/transcript
    else if (req.method === 'GET') {
        try {
            console.log('Received GET /patient-encounters/:id/transcript request');
            
            // Step 1: Fetch patient encounter with decrypted AES key
            const encounterResult = await getPatientEncounterWithDecryptedKey(supabase, patientEncounterId);
            if (!encounterResult.success) {
                return res.status(encounterResult.statusCode).json({ error: encounterResult.error });
            }
            
            const { data: patientEncounter, aes_key } = encounterResult;
            
            if (!patientEncounter.recording_id) {
                return res.status(400).json({ error: 'Patient encounter has no associated recording' });
            }
            
            // Step 2: Fetch transcript for this recording
            const { data: transcript, error: fetchTranscriptError } = await supabase
                .from(transcriptTable)
                .select('*')
                .eq('recording_id', patientEncounter.recording_id)
                .single();
            
            if (fetchTranscriptError) {
                if (fetchTranscriptError.code === 'PGRST116') {
                    return res.status(404).json({ error: 'Transcript not found' });
                }
                return res.status(500).json({ error: fetchTranscriptError.message });
            }
            
            // Step 3: Decrypt transcript_text
            const decryptResult = await encryptionUtils.decryptField(transcript, 'transcript_text', aes_key);
            
            if (!decryptResult.success) {
                return res.status(500).json({ error: decryptResult.error });
            }
            
            return res.status(200).json({ success: true, data: transcript });
        }
        catch (err) {
            console.error('GET /patient-encounters/:id/transcript error:', err);
            return res.status(500).json({ error: err.message });
        }
    }

    else {
        return res.status(405).json({ error: 'Method not allowed' });
    }
}
