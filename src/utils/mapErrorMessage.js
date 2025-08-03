// Maps backend error messages to more user-friendly frontend messages
// Also prints the original error to the console for debugging

/**
 * Remaps backend error messages to user-friendly frontend messages.
 * @param {string} errorMsg - The original error message from backend/API.
 * @returns {string} - The user-friendly error message for frontend display.
 */
export function mapErrorMessage(errorMsg) {
  if (!errorMsg || typeof errorMsg !== 'string') return 'An unknown error occurred.';

  // Print original error for debugging
  console.error('Backend error:', errorMsg);

  // Common remapping rules
  if (/JSON object requested, multiple (or no) rows returned/i.test(errorMsg)) {
    return 'The requested data was not found.';
  }
  if (/invalid input syntax for type/i.test(errorMsg)) {
    return 'Invalid input format. Please check your entry.';
  }
  if (/duplicate key value violates unique constraint/i.test(errorMsg)) {
    return 'This item already exists.';
  }
  if (/permission denied/i.test(errorMsg)) {
    return 'You do not have permission to perform this action.';
  }
  if (/record not found|row not found|no rows/i.test(errorMsg)) {
    return 'No matching record found.';
  }
  if (/network error|fetch failed|failed to fetch/i.test(errorMsg)) {
    return 'Network error. Please check your connection and try again.';
  }
  if (/jwt expired|token expired/i.test(errorMsg)) {
    return 'Your session has expired. Please log in again.';
  }
  if (/jwt malformed|invalid token/i.test(errorMsg)) {
    return 'Authentication error. Please log in again.';
  }
  if (/storage quota exceeded/i.test(errorMsg)) {
    return 'Storage limit reached. Please delete old files or contact support.';
  }
  if (/foreign key constraint/i.test(errorMsg)) {
    return 'This record is linked to other data in the database and cannot be deleted.';
  }
  if (/ZodError/i.test(errorMsg)) {
    // Try to extract and format the error details
    try {
      const match = errorMsg.match(/\[(.*)\]/s);
      if (match && match[1]) {
        const details = JSON.parse(match[0]);
        if (Array.isArray(details)) {
          return details
            .map(
              (err) =>
                `${err.message}${err.path && err.path.length ? ` (at ${err.path.join('.')})` : ''}`
            )
            .join('; ');
        }
      }
    } catch (e) {
      // Fallback if parsing fails
      return 'Invalid form data. Please check your entries and try again.';
    }
    return 'Invalid form data. Please check your entries and try again.';
  }
  // Add more rules as needed

  // Default fallback
  return 'An error occurred: ' + errorMsg;
}
