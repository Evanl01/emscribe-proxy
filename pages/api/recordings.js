import supabase from '@/src/utils/supabase';
import { authenticateRequest } from '@/src/utils/authenticateRequest';
import { recordingSchema } from '@/src/app/schemas';
import { filterUserIdFromReqBody } from '@/src/utils/filterUserIdFromReqBody';
import { validateOwnership } from '@/src/utils/validateOwnership';

const recordingTableName = 'recordings';

export default async function handler(req, res) {
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
        // Validate ownership before fetching
        const isValid = await validateOwnership(recordingTableName, id, user.id);
        if (!isValid) {
            return res.status(403).json({ error: 'Invalid Recording id. Does not exist, or does not belong to user.' });
        }
        const { data, error } = await supabase //Only fetch SOAP notes for the authenticated user
            .from(recordingTableName)
            .select('*') // Select all fields
            .eq('id', id)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        // console.log('Fetched recordings:', data);
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }


    // DELETE ------------------------------------------------------------------------
    if (req.method === 'DELETE') {
        const { id } = req.query;
        if (!id) return res.status(400).json({ error: 'Recording ID is required' });
        // Validate ownership before deleting
        const isValid = await validateOwnership(recordingTableName, id, user.id);
        if (!isValid) {
            return res.status(403).json({ error: 'Invalid Recording id. Does not exist, or does not belong to user.' });
        }
        // Fetch the recording to get the audio file path
        const { data: recording, error: fetchError } = await supabase
            .from(recordingTableName)
            .select('audio_file_path')
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
        if (!storagePath.startsWith('audio-files/')) {
            return res.status(400).json({ error: 'Unhandled audio file path: ' + storagePath });
        }
        storagePath = storagePath.replace('audio-files/', ''); // Remove the prefix for deletion
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
            .eq('user_id', user.id)
            .select()
            .single();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, data });
    }


    // PATCH: --------------------------------------------------------------------------------
    // PATCH: Rename an existing file (expects id and name in body)
    if (req.method === 'PATCH') {
        console.log(req.body);
        const { data: recordingData, error: filterError } = filterUserIdFromReqBody(req.body, user.id);
        if (filterError) return res.status(403).json({ error: filterError });

        const parseResult = recordingSchema.partial().safeParse(recordingData);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.errors });
        }
        const recording = parseResult.data;
        if (!recording.id || !recording.name) {
            return res.status(400).json({ error: 'Recording ID and name are required for renaming' });
        }

        // Validate ownership before renaming
        // console.log('Validating ownership for recording.id:', recording.id, 'user.id:', user.id);
        const isValid = await validateOwnership(recordingTableName, recording.id, user.id);
        if (!isValid) {
            return res.status(403).json({ error: 'Invalid Recording id. Does not exist, or does not belong to user.' });
        }

        // Check if a recording with the same name already exists for this user
        const { data: existing, error: nameCheckError } = await supabase
            .from(recordingTableName)
            .select('id')
            .eq('user_id', user.id)
            .eq('name', recording.name)
            .maybeSingle();

        if (nameCheckError) {
            res.status(400).json({ error: nameCheckError.message });
            return resolve();
        }
        if (existing) {
            res.status(400).json({ error: 'A recording with this name already exists.' });
            return resolve();
        }

        // Fetch current file path from DB
        const { data: updatedData, error: fetchError } = await supabase
            .from(recordingTableName)
            .update({ name: recording.name })
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