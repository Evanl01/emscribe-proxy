import supabase from '@/src/utils/supabase';
import { authenticateRequest } from '@/src/utils/authenticateRequest';

// GET /api/patient-encounters?limit=10&offset=0
export default async function handler(req, res) {
  const { user, error: authError } = await authenticateRequest(req);
  if (authError) return res.status(401).json({ error: authError });

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = parseInt(req.query.offset, 10) || 0;

  // Fetch recordings with related transcripts and soapNotes
  const { data: recordings, error } = await supabase
    .from('recordings')
    .select(`
      id,
      name,
      audio_file_path,
      created_at,
      transcripts(*),
      soapNotes(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return res.status(500).json({ error: error.message });

  // Format response: each encounter has recording info, transcript(s), soapNote(s), and a download URL for the audio file
    // Generate signed URLs for audio files (private bucket)
    const signedUrls = await Promise.all(
      (recordings || []).map(async rec => {
        if (rec.audio_file_path) {
          const { data, error } = await supabase.storage
            .from('audio-files')
            .createSignedUrl(rec.audio_file_path, 60 * 60); // 1 hour expiry
          return data?.signedUrl || null;
        }
        return null;
      })
    );

    const encounters = (recordings || []).map((rec, i) => ({
      id: rec.id,
      name: rec.name,
      created_at: rec.created_at,
      audio_url: signedUrls[i],
      transcripts: rec.transcripts || [],
      soapNotes: rec.soapNotes || [],
    }));

  return res.status(200).json({ encounters });
}
