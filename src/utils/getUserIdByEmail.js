// import supabase from './supabase';

// /**
//  * Gets the user ID (UUID) from the auth.users table by email.
//  * @param {string} email - The user's email address.
//  * @returns {Promise<string|null>} The user ID or null if not found.
//  */
// export async function getUserIdByEmail(email) {
//   const { data, error } = await supabase
//     .from('users')
//     .select('id')
//     .eq('email', email)
//     .single();

//   if (error || !data) {
//     return null;
//   }
//   return data.id;
// }