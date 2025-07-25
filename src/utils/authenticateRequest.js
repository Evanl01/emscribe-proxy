import { verifyToken } from './verifyToken';

/**
 * Extracts and verifies the JWT token from the request headers.
 * @param {object} req - The Next.js API request object.
 * @returns {Promise<{ user: object|null, error: string|null }>}
 */
export async function authenticateRequest(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return { user: null, error: 'Token is required' };
  }
  return await verifyToken(token);
}