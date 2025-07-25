import supabase from './supabase';

/**
 * Checks if a record in any table exists and belongs to the given user.
 * @param {string} tableName - The table to check.
 * @param {number|string} recordId - The record's primary key value.
 * @param {string} userId - The authenticated user's ID.
 * @param {string} [idField='id'] - The primary key field name (default: 'id').
 * @returns {Promise<boolean>}
 */
export async function validateOwnership(tableName, recordId, userId, idField = 'id') {
  console.log(`Validating ownership for record ${recordId} in table ${tableName} for user ${userId}`);
  const { data, error } = await supabase
    .from(tableName)
    .select(idField)
    .eq(idField, recordId)
    .eq('user_id', userId)
    .single();

  if (error || !data) return false;
  return true;
}