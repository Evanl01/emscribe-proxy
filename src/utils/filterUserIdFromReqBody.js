/**
 * Removes user_id from the request body and checks for unauthorized use.
 * @param {object} reqBody - The request body object.
 * @param {string} authenticatedUserId - The user ID from the authenticated session.
 * @returns {{ data: object, error: string|null }}
 */
export function filterUserIdFromReqBody(reqBody, authenticatedUserId) {
  const { user_id, ...data } = reqBody;
  if (user_id && user_id !== authenticatedUserId) {
    return { data: null, error: "Access denied: attempting to perform operations using another user's ID" };
  }
  return { data, error: null };
}