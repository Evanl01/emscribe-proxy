import { getSupabaseClient } from '@/src/utils/supabase';
import { authenticateRequest } from '@/src/utils/authenticateRequest';

export default async function handler(req, res) {
    const supabase = getSupabaseClient(req.headers.authorization);
    const { user, error: authError } = await authenticateRequest(req);
    if (authError) return res.status(401).json({ error: authError });

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const recording_id = req.query.recording_id;
        if (!recording_id) {
            return res.status(400).json({ error: 'Recording ID is required' });
        }
        // Fetch recording matching the recording_id and user_id
        const { data: recording, error: recError } = await supabase
            .from('recordings')
            .select('*')
            .eq('id', recording_id)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (recError) return res.status(500).json({ error: recError.message });


        // Fetch transcript for this recording
        const { data: transcript, error: transError } = await supabase
            .from('transcripts')
            .select('*')
            .eq('recording_id', recording.id);

        if (transError) throw new Error(transError.message);

        // Only use the first transcript (if any)
        let transcriptWithSoapNotes = null;
        const { data: soapNotes, error: soapError } = await supabase
            .from('soapNotes')
            .select('*')
            .eq('transcript_id', transcript.id);

        if (soapError) throw new Error(soapError.message);

        transcriptWithSoapNotes = {
            ...transcript,
            soapNotes: soapNotes || [],
        };
        // Generate signed URL for audio file if present
        let audio_url = null;
        if (recording.audio_file_path) {
            const { data: signedData, error: signedError } = await supabase.storage
                .from('audio-files')
                .createSignedUrl(recording.audio_file_path, 60 * 60);
            if (signedError) throw new Error(signedError.message);
            audio_url = signedData?.signedUrl || null;
        }

        const patient_encounter = {
            id: recording.id,
            name: recording.name,
            created_at: recording.created_at,
            audio_url,
            transcript: transcriptWithSoapNotes,
        };

        return res.status(200).json({ patient_encounter });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}