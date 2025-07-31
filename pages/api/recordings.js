import { getSupabaseClient } from '@/src/utils/supabase';

import { authenticateRequest } from '@/src/utils/authenticateRequest';
import { recordingSchema } from '@/src/app/schemas';
const recordingTableName = 'recordings';

export default async function handler(req, res) {
    const supabase = getSupabaseClient(req.headers.authorization);
    // Authenticate user for all methods
    const { user, error: authError } = await authenticateRequest(req);
    if (authError) return res.status(401).json({ error: authError });

    // GET: ------------------------------------------------------------------------------
    // GET: List all audio files for this user
    if (req.method === 'GET') {
        // console.log('Fetched recordings for user:', user.id, "with JWT:", req.headers.authorization);
        const id = req.query.id; // Optional ID for filtering
        if (!id) {
            return res.status(400).json({ error: 'Recording ID is required' });
        }
        const { data, error } = await supabase //Only fetch SOAP notes for the authenticated user
            .from(recordingTableName)
            .select('*') // Select all fields
            .eq('id', id)
            .order('created_at', { ascending: false });
        // console.log('Fetched recordings:', data);
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }


    // DELETE ------------------------------------------------------------------------
    if (req.method === 'DELETE') {
        // Fetch the recording to get the audio file path
        const id = req.query.id; // ID of the recording to delete
        if (!id) return res.status(400).json({ error: 'Recording ID is required' });
        const { data: recording, error: fetchError } = await supabase
            .from(recordingTableName)
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();
        if (fetchError || !recording) {
            return res.status(404).json({ error: 'Recording not found.' });
        }

        // Delete the file from the bucket
        let storagePath = recording.audio_file_path;
        if (!storagePath) {
            return res.status(400).json({ error: 'No audio file associated with this recording.' });
        }
        if (storagePath.startsWith('audio-files/')) {
            storagePath = storagePath.replace('audio-files/', ''); // Remove the prefix for deletion
        }
        // console.log('Deleting audio file at path:', storagePath);
        const { error: fileDeleteError } = await supabase.storage
            .from('audio-files')
            .remove([storagePath]);
        if (fileDeleteError) {
            return res.status(500).json({ error: fileDeleteError.message });
        }

        // Delete the DB record
        const { data, error } = await supabase
            .from(recordingTableName)
            .delete()
            .eq('id', id)
            .select()
            .single();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, data });
    }


    // PATCH: --------------------------------------------------------------------------------
    // PATCH: Rename an existing file (expects id and name in body)
    if (req.method === 'PATCH') {
        // console.log(req.body);

        const parseResult = recordingSchema.partial().safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error });
        }
        const recording = parseResult.data;

        if (!recording.id) {
            return res.status(400).json({ error: 'Recording ID is required' });
        }
        const updateFields = {};
        if (recording.name) updateFields.name = recording.name;
        if (recording.audio_file_path) updateFields.audio_file_path = recording.audio_file_path;
        // Add other fields as needed

        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }
        console.log('Recording (PATCH):', recording);
        console.log('User ID:', user.id);
        // Fetch current file path from DB
        const { data: updatedData, error: fetchError } = await supabase
            .from(recordingTableName)
            .update(updateFields)
            .eq('id', recording.id)
            .eq('user_id', user.id)
            .select()
            .single();
        if (fetchError || !updatedData) {
            return res.status(404).json({ error: fetchError || 'Recording not found' });
        }
        return res.status(200).json({ success: true, data: updatedData });
    }



    res.status(405).json({ error: 'Method not allowed' });
}