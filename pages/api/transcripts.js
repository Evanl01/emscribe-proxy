import supabase from '@/src/utils/supabase';
import { authenticateRequest } from '@/src/utils/authenticateRequest';
import { transcriptSchema } from '@/src/app/schemas';
import { filterUserIdFromReqBody } from '@/src/utils/filterUserIdFromReqBody';
import { validateOwnership } from '@/src/utils/validateOwnership';
import { filterForbiddenFields } from '@/src/utils/filterForbiddenFields';

const transcriptTableName = 'transcripts';

export default async function handler(req, res) {

    // Authenticate user for all methods
    const { user, error: authError } = await authenticateRequest(req);
    if (authError) return res.status(401).json({ error: authError });

    // GET ---------------------------------------------------------
    if (req.method === 'GET') {
        const { data, error } = await supabase
            .from(transcriptTableName)
            .select('*')// Select all fields
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    // POST -------------------------------------------------------
    if (req.method === 'POST') {

        const { data: transcriptData, error: filterError } = filterUserIdFromReqBody(req.body, user.id);
        if (filterError) return res.status(403).json({ error: filterError });
        // console.log('Transcript Data:', transcriptData);
        const parseResult = transcriptSchema.safeParse(transcriptData);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error });
        }
        const transcript = parseResult.data;

        if (!transcript.transcript_text) {
            return res.status(400).json({ error: 'Transcript text is required' });
        }
        // console.log('Transcript:', transcript);
        const { data, error } = await supabase
            .from(transcriptTableName)
            .insert([{ ...transcript, user_id: user.id }])
            .select()
            .single();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(201).json(data);
    }

    // PATCH -------------------------------------------------------
    if (req.method === 'PATCH') {
        const { data: filterData, error: filterError } = filterUserIdFromReqBody(req.body, user.id);
        if (filterError) return res.status(403).json({ error: filterError });

        const { data: updateFields, error: forbiddenError } = filterForbiddenFields(filterData, ['recording_id']);
        if (forbiddenError) return res.status(403).json({ error: forbiddenError });

        const parseResult = transcriptSchema.partial().safeParse(updateFields);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.errors });
        }

        const transcript = parseResult.data;
        if (!transcript.id) {
            return res.status(400).json({ error: 'id is required for update' });
        }

        // Validate ownership before updating
        const isValid = await validateOwnership(transcriptTableName, transcript.id, user.id);
        if (!isValid) {
            return res.status(403).json({ error: 'Invalid transcript id. Does not exist, or does not belong to user.' });
        }
        const { data, error } = await supabase
            .from(transcriptTableName) // Only update based on transcript.id given, and if the user_id matches
            .update(transcript)
            .eq('id', transcript.id)
            .eq('user_id', user.id)
            .select();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }


    // DELETE ------------------------------------------------------------------------
    if (req.method === 'DELETE') {
        const { id } = req.query;
        if (!id) return res.status(400).json({ error: 'Transcript ID is required' });
        // Validate ownership before deleting
        const isValid = await validateOwnership(transcriptTableName, id, user.id);
        if (!isValid) {
            return res.status(403).json({ error: 'Invalid Transcript id. Does not exist, or does not belong to user.' });
        }
        const { data, error } = await supabase
            .from(transcriptTableName)
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, data });
    }
    res.status(405).json({ error: 'Method not allowed' });
}