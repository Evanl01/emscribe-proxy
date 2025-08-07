import { getSupabaseClient } from '@/src/utils/supabase';
import { authenticateRequest } from '@/src/utils/authenticateRequest';
import { transcriptSchema } from '@/src/app/schemas';
import { decryptField } from '@/src/utils/encryptionUtils';

const transcriptTableName = 'transcripts';

export default async function handler(req, res) {
    const supabase = getSupabaseClient(req.headers.authorization);
    const { user, error: authError } = await authenticateRequest(req);
    if (authError) return res.status(401).json({ error: authError });

    // GET ---------------------------------------------------------
    if (req.method === 'GET') {
        // Join transcripts -> recordings -> patientEncounters to get encrypted_aes_key
        const { data, error } = await supabase
            .from(transcriptTableName)
            .select(`
                *,
                recording:recording_id (
                    id,
                    patientEncounter:patientEncounter_id (
                        encrypted_aes_key
                    )
                )
            `)
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

        if (error) return res.status(500).json({ error: error.message });

        for (let transcript of data) {
            // Get the joined encrypted_aes_key
            const encryptedAESKey = transcript.recording?.patientEncounter?.encrypted_aes_key || null;

            let decryptFieldResult = await decryptField(transcript, 'transcript_text', encryptedAESKey);
            if (!decryptFieldResult.success) {
                console.error('Failed to decrypt transcript:', transcript.id, ". Error:", decryptFieldResult.error);
                return res.status(400).json({ error: decryptFieldResult.error });
            }
            // Optionally clean up joined fields
            delete transcript.recording;
        }

        return res.status(200).json(data);
    }
    
    res.status(405).json({ error: 'Method not allowed' });
}