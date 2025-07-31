import { getSupabaseClient } from '@/src/utils/supabase';
import { authenticateRequest } from '@/src/utils/authenticateRequest';
import { soapNoteSchema } from '@/src/app/schemas';
import { filterUserIdFromReqBody } from '@/src/utils/filterUserIdFromReqBody';
import { validateOwnership } from '@/src/utils/validateOwnership';
import { filterForbiddenFields } from '@/src/utils/filterForbiddenFields';

const soapNoteTableName = 'soapNotes';

export default async function handler(req, res) {
  const supabase = getSupabaseClient(req.headers.authorization);
  // Authenticate user for all methods
  const { user, error: authError } = await authenticateRequest(req);
  if (authError) return res.status(401).json({ error: authError });



  // GET: ------------------------------------------------------------------------------
  if (req.method === 'GET') {
    // Get all SOAP notes

    const { data, error } = await supabase //Only fetch SOAP notes for the authenticated user
      .from(soapNoteTableName)
      .select('*')// Select all fields
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }
  res.status(405).json({ error: 'Method not allowed' });
}