import { getSupabaseClient } from '@/src/utils/supabase';
import { authenticateRequest } from '@/src/utils/authenticateRequest';
import { soapNoteSchema } from '@/src/app/schemas';

const soapNoteTableName = 'soapNotes';

export default async function handler(req, res) {
  const supabase = getSupabaseClient(req.headers.authorization);
  // Authenticate user for all methods
  const { user, error: authError } = await authenticateRequest(req);
  if (authError) return res.status(401).json({ error: authError });



  // GET: ------------------------------------------------------------------------------
  if (req.method === 'GET') {
    // Get all SOAP notes
    const id = req.query.id;
    if (!id) { return res.status(400).json({ error: 'id is required' }); }
    const { data, error } = await supabase //Only fetch SOAP notes for the authenticated user
      .from(soapNoteTableName)
      .select('*')// Select all fields
      .eq('id', id)
      .single(); // Get a single record
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }


  // POST --------------------------------------------------------------------------------
  // Create a new SOAP note
  if (req.method === 'POST') {
    // console.log('SOAP Note Data:', soapNoteData);
    const parseResult = soapNoteSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error });
    }
    const soapNote = parseResult.data;
    soapNote.user_id = user.id; // Ensure user_id is set to the authenticated user's ID
    // console.log('SOAP Note:', soapNote);

    if (!soapNote.soapNote_text || !soapNote.transcript_id) {
      return res.status(400).json({ error: 'soapNote_text, and transcript_id are required' });
    }
    console.log('SOAP Note:', soapNote);
    const { data, error } = await supabase
      .from(soapNoteTableName)
      .insert([soapNote])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // PATCH ------------------------------------------------------------------------
  if (req.method === 'PATCH') {
    const parseResult = soapNoteSchema.partial().safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error });
    }
    const soapNote = parseResult.data;
    if (!soapNote.id) {
      return res.status(400).json({ error: 'id is required' });
    }

    
    const { data, error } = await supabase
      .from(soapNoteTableName)
      .update(soapNote)
      .eq('id', soapNote.id)
      .select();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }


  // DELETE ------------------------------------------------------------------------
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'SOAP Note ID is required' });
    // Validate ownership before deleting
    const { data, error } = await supabase
      .from(soapNoteTableName)
      .delete()
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, data });
  }

  res.status(405).json({ error: 'Method not allowed' });
}