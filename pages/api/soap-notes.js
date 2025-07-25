import supabase from '@/src/utils/supabase';
import { authenticateRequest } from '@/src/utils/authenticateRequest';
import { soapNoteSchema } from '@/src/app/schemas';
import { filterUserIdFromReqBody } from '@/src/utils/filterUserIdFromReqBody';
import { validateOwnership } from '@/src/utils/validateOwnership';
import { filterForbiddenFields } from '@/src/utils/filterForbiddenFields';

const soapNoteTableName = 'soapNotes';

export default async function handler(req, res) {

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


  // POST --------------------------------------------------------------------------------
  // Create a new SOAP note
  if (req.method === 'POST') {
    // console.log('soapNoteSchema:', soapNoteSchema);
    const { data: soapNoteData, error: filterError } = filterUserIdFromReqBody(req.body, user.id);
    if (filterError) return res.status(403).json({ error: filterError });
    // console.log('SOAP Note Data:', soapNoteData);
    const parseResult = soapNoteSchema.safeParse(soapNoteData);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors });
    }
    const soapNote = parseResult.data;
    // console.log('SOAP Note:', soapNote);

    if (!soapNote.chief_complaint || !soapNote.soapNote_text || !soapNote.transcript_id) {
      return res.status(400).json({ error: 'chief_complaint, soapNote_text, and transcript_id are required' });
    }
    // Check if owns transcript
    const isValid = await validateOwnership('transcripts', soapNote.transcript_id, user.id);
    if (!isValid) {
      return res.status(403).json({ error: 'Invalid transcript_id. Does not exist, or does not belong to user.' });
    }

    const { data, error } = await supabase
      .from(soapNoteTableName)
      .insert([{ ...soapNote, user_id: user.id }])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  // PATCH ------------------------------------------------------------------------
  if (req.method === 'PATCH') {
    const { data: filterData, error: filterError } = filterUserIdFromReqBody(req.body, user.id);
    if (filterError) return res.status(403).json({ error: filterError });

    const { data: soapNoteData, error: forbiddenError } = filterForbiddenFields(filterData, ['transcript_id']);
    if (forbiddenError) return res.status(403).json({ error: forbiddenError });

    const parseResult = soapNoteSchema.partial().safeParse(soapNoteData);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors });
    }
    const soapNote = parseResult.data;
    if (!soapNote.id) {
      return res.status(400).json({ error: 'SOAP Note ID is required for update' });
    }

    // Validate ownership before updating
    const isValid = await validateOwnership(soapNoteTableName, soapNote.id, user.id);
    if (!isValid) {
      return res.status(403).json({ error: 'Invalid SOAP Note id. Does not exist, or does not belong to user.' });
    }

    const { data, error } = await supabase
      .from(soapNoteTableName)
      .update(soapNote)
      .eq('id', soapNote.id)
      .eq('user_id', user.id)
      .select();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }


  // DELETE ------------------------------------------------------------------------
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'SOAP Note ID is required' });
    // Validate ownership before deleting
    const isValid = await validateOwnership(soapNoteTableName, id, user.id);
    if (!isValid) {
      return res.status(403).json({ error: 'Invalid SOAP Note id. Does not exist, or does not belong to user.' });
    }
    const { data, error } = await supabase
      .from(soapNoteTableName)
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