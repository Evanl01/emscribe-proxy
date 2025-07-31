import fs from 'fs';
import path from 'path';
import { getSupabaseClient } from '@/src/utils/supabase';

export default function handler(req, res) {
  const supabase = getSupabaseClient(req.headers.authorization);

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Use env vars for key path and ID
  const keyId = process.env.PUBLIC_KEY_ID || 'default';
  const pubKeyPath = process.env.PUBLIC_KEY_PATH || 'keys/public.pem';
  const resolvedPath = path.resolve(process.cwd(), pubKeyPath);

  try {
    const publicKey = fs.readFileSync(resolvedPath, 'utf8');
    res.status(200).json({ keyId, publicKey });
  } catch (err) {
    res.status(500).json({ error: 'Public key not found' });
  }
}