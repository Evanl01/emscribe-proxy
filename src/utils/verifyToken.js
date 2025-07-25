import supabase from './supabase';

/**
 * Verifies a JWT token and returns the user object if valid.
 * @param {string} token - The JWT token to verify.
 * @returns {Promise<{ user: object|null, error: string|null }>}
 */
export async function verifyToken(token) {
  if (!token) {
    return { user: null, error: 'No token provided' };
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    // console.log('Token verification error:', error, data);
    return { user: null, error: 'Invalid or expired token' };
  }

  return { user: data.user, error: null };
}