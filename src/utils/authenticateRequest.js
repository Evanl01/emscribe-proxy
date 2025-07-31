import { getSupabaseClient } from './supabase';
/**
 * Extracts and verifies the JWT token from the request headers.
 * @param {object} req - The Next.js API request object.
 * @returns {Promise<{ user: object|null, error: string|null }>} - Returns a promise that resolves to an object containing the user and any error message.
 */
export async function authenticateRequest(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return { user: null, error: 'JWT Token is required' };
  }

  const supabase = getSupabaseClient(token);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    // console.log('Token verification error:', error, data);
    return { user: null, error: 'Invalid or expired token' };
  }
  // console.log('Token verified successfully:', data.user);

  return { user: data.user, error: null };
}