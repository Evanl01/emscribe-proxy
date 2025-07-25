/**
 * Filters forbidden fields from the request body and checks for unauthorized changes. e.g. PATCH changing FK like recording_id.
 * @param {object} reqBody - The request body.
 * @param {string[]} forbiddenFields - Array of fields that must not be updated.
 * @returns {{ data: object, error: string|null }}
 */
export function filterForbiddenFields(reqBody, forbiddenFields = []) {
  
  for (const field of forbiddenFields) {
    if (field in reqBody) {
      return { data: null, error: `Access denied: Field "${field}" cannot be updated via API.` };
    }
  }
  return { data: reqBody, error: null };
}