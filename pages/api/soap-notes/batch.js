import { getSupabaseClient } from '@/src/utils/supabase';
import { authenticateRequest } from '@/src/utils/authenticateRequest';
import { soapNoteSchema } from '@/src/app/schemas';
import { decryptField, encryptionUtils } from '@/src/utils/encryptionUtils';

const soapNoteTableName = 'soapNotes';

export default async function handler(req, res) {
  const supabase = getSupabaseClient(req.headers.authorization);
  // Authenticate user for all methods
  const { user, error: authError } = await authenticateRequest(req);
  if (authError) return res.status(401).json({ error: authError });



  // GET: ------------------------------------------------------------------------------
  if (req.method === 'GET') {
    // Get all SOAP notes
    const { data, error } = await supabase
      .from('soapNotes')
      .select(`
    *,
    patientEncounter:patientEncounter_id (
      encrypted_aes_key
    )
  `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    for (let soapNote of data) {
      // Use the joined patientEncounter field from the query
      const encryptedAESKey = soapNote.patientEncounter?.encrypted_aes_key || null;

      let decryptFieldResult = await decryptField(soapNote, 'soapNote_text', encryptedAESKey);
      if (!decryptFieldResult.success) {
        console.error('Failed to decrypt SOAP note:', soapNote.id, ". Error:", decryptFieldResult.error);
        return res.status(400).json({ error: decryptFieldResult.error });
      }
      delete soapNote.patientEncounter; // Clean up the joined field
    }
    return res.status(200).json(data);
  }
  res.status(405).json({ error: 'Method not allowed' });
}