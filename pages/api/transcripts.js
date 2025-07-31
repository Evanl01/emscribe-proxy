import { getSupabaseClient } from '@/src/utils/supabase';
import { authenticateRequest } from '@/src/utils/authenticateRequest';
import { transcriptSchema } from '@/src/app/schemas';
import { filterUserIdFromReqBody } from '@/src/utils/filterUserIdFromReqBody';
import { validateOwnership } from '@/src/utils/validateOwnership';
import { filterForbiddenFields } from '@/src/utils/filterForbiddenFields';

const transcriptTableName = 'transcripts';

export default async function handler(req, res) {
    const supabase = getSupabaseClient(req.headers.authorization);
    // Authenticate user for all methods
    const { user, error: authError } = await authenticateRequest(req);
    if (authError) return res.status(401).json({ error: authError });

    // GET ---------------------------------------------------------
    if (req.method === 'GET') {
        const id = req.query.id;
        if (!id) return res.status(400).json({ error: 'id is required' });
        const { data, error } = await supabase
            .from(transcriptTableName)
            .select('*')// Select all fields
            .eq('id', id)
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    // POST -------------------------------------------------------
    if (req.method === 'POST') {
        const parseResult = transcriptSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error });
        }
        const transcript = parseResult.data;
        transcript.user_id = user.id; // Ensure user_id is set to the authenticated user's ID
        if (!transcript.transcript_text) {
            return res.status(400).json({ error: 'Transcript text is required' });
        }
        // console.log('Transcript:', transcript);
        const { data, error } = await supabase
            .from(transcriptTableName)
            .insert([transcript ])
            .select()
            .single();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(201).json(data);
    }

    // PATCH -------------------------------------------------------
    if (req.method === 'PATCH') {
        const parseResult = transcriptSchema.partial().safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error });
        }

        const transcript = parseResult.data;
        if (!transcript.id) {
            return res.status(400).json({ error: 'id is required for update' });
        }
        const { data, error } = await supabase
            .from(transcriptTableName) // Only update based on transcript.id given, and if the user_id matches
            .update(transcript)
            .eq('id', transcript.id)
            .select()
            .single();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }


    // DELETE ------------------------------------------------------------------------
    if (req.method === 'DELETE') {
        const id = req.query.id;
        if (!id) return res.status(400).json({ error: 'Transcript ID is required' });
        
        const { data, error } = await supabase
            .from(transcriptTableName)
            .delete()
            .eq('id', id)
            .select()
            .single();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, data });
    }
    res.status(405).json({ error: 'Method not allowed' });
}