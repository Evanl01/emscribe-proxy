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
        console.log('Transcripts: ', data);
        return res.status(200).json(data);
    }
    
   res.status(405).json({ error: 'Method not allowed' });
}