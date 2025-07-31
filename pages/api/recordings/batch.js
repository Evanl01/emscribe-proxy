import { getSupabaseClient } from '@/src/utils/supabase';
import { authenticateRequest } from '@/src/utils/authenticateRequest';
import { recordingSchema } from '@/src/app/schemas';
import { filterUserIdFromReqBody } from '@/src/utils/filterUserIdFromReqBody';
import { validateOwnership } from '@/src/utils/validateOwnership';

const recordingTableName = 'recordings';

export default async function handler(req, res) {
    // Authenticate user for all methods
    const supabase = getSupabaseClient(req.headers.authorization);
    const { user, error: authError } = await authenticateRequest(req);
    if (authError) return res.status(401).json({ error: authError });

    // GET: ------------------------------------------------------------------------------
    // GET: List all audio files for this user
    if (req.method === 'GET') {
        // console.log('Fetched recordings for user:', user.id, "with JWT:", req.headers.authorization);
        const { data, error } = await supabase //Only fetch SOAP notes for the authenticated user
            .from(recordingTableName)
            .select('*')// Select all fields
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        // console.log('Fetched recordings:', data);
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

   res.status(405).json({ error: 'Method not allowed' });
}