// lib/api.js - API-related functions
const API_BASE = process.env.NODE_ENV === 'development' ? '' : process.env.NEXT_PUBLIC_API_URL || '';

// Helper to get JWT from localStorage (client-side only)
export const getJWT = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('jwt');
};

// Set or clear JWT in localStorage (client-side only)
export const setJWT = (token) => {
  if (typeof window === 'undefined') throw new Error('setJWT failed. Can only be called in the browser');
  localStorage.setItem('jwt', token);
};
export const deleteJWT = () => {
  if (typeof window === 'undefined') throw new Error('deleteJWT failed. Can only be called in the browser');
  localStorage.removeItem('jwt');
};

// Sign-out helper: calls server to revoke session + clear httpOnly cookie (server-side),
// then clears local client token and tries to clear any non-httpOnly cookie named "refresh_token".
// Name chosen as `handleSignOut` to match React event-handler naming conventions.
export const handleSignOut = async ({ redirectTo = '/login' } = {}) => {
  if (typeof window === 'undefined') throw new Error('handleSignOut must be called in the browser');
  const jwt = getJWT();
  const headers = { 'Content-Type': 'application/json' };
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`;

  try {
    // POST to server endpoint which will revoke server-side refresh token and clear the httpOnly cookie
    const res = await fetch(`${API_BASE}/api/auth`, {
      method: 'POST',
      credentials: 'include', // send cookie so server can revoke and clear it
      headers,
      body: JSON.stringify({ action: 'sign-out' }),
    });

    // Always clear local JWT storage regardless of server response
    try { deleteJWT(); } catch (e) { /* ignore */ }

    // Best-effort: clear non-httpOnly cookie named refresh_token (if any)
    try {
      document.cookie = 'refresh_token=; Path=/; Max-Age=0; SameSite=Lax;';
    } catch (e) { /* ignore */ }

    // If caller wants a redirect (default to /login), perform it now.
    if (redirectTo) {
      // use assign so back button behavior is normal
      try { window.location.assign(redirectTo); } catch (e) { window.location.href = redirectTo; }
      // return after initiating redirect
      return { success: res.ok, status: res.status };
    }

    if (res.ok) {
      return { success: true };
    }

    const body = await res.json().catch(() => null);
    return { success: false, status: res.status, error: body?.error || res.statusText };
  } catch (error) {
    // Network failure — still clear local state
    try { deleteJWT(); } catch (e) { /* ignore */ }
    try { document.cookie = 'refresh_token=; Path=/; Max-Age=0; SameSite=Lax;'; } catch (e) {}
    if (redirectTo) {
      try { window.location.assign(redirectTo); } catch (e) { window.location.href = redirectTo; }
      return { success: false, error: error?.message || String(error) };
    }
    return { success: false, error: error?.message || String(error) };
  }
};

// Generic fetch helper that will try the request, and on 401 attempt a single
// refresh via /api/auth/refresh (credentials included) and retry once using
// the refreshed access token. Returns the original response if refresh fails.
export const fetchWithRefresh = async (input, init = {}) => {
  const makeRequest = async (token) => {
    const headers = new Headers(init.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    // default content-type if body present and not set
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const opts = { ...init, headers };
    return fetch(input, opts);
  };

  // try with existing client token if available
  let currentToken = getJWT();
  let resp = await makeRequest(currentToken);
  if (resp.status !== 401) return resp;

  // try refresh endpoint once
  try {
    const refreshUrl = `${API_BASE}/api/auth/refresh`;
    const r = await fetch(refreshUrl, { method: 'POST', credentials: 'include' });
    if (!r.ok) return resp; // return original 401 response
    const j = await r.json();
    const newToken = j?.accessToken || j?.token || null;
    if (!newToken) return resp;
    // update client-side jwt store
    try { setJWT(newToken); } catch (e) {}
    // retry with new token
    resp = await makeRequest(newToken);
    return resp;
  } catch (e) {
    return resp;
  }
};

// Fetch all transcripts from backend
export const getAllTranscripts = async () => {
  const jwt = getJWT();
  try {
    const res = await fetch(`${API_BASE}/api/transcripts/batch`, {
      headers: { 'Authorization': `Bearer ${jwt}` }
    });
    
    if (!res.ok) {
      console.error('Failed to fetch transcripts:', res.status, res.statusText);
      return {};
    }
    
    return await res.json();
  } catch (error) {
    console.error('Error fetching transcripts:', error);
    return {};
  }
};

// Fetch all SOAP notes from backend
export const getAllSoapNotes = async () => {
  const jwt = getJWT();
  try {
    const res = await fetch(`${API_BASE}/api/soap-notes/batch`, {
      headers: { 'Authorization': `Bearer ${jwt}` }
    });
    
    if (!res.ok) {
      console.error('Failed to fetch SOAP notes:', res.status, res.statusText);
      return {};
    }
    
    return await res.json();
  } catch (error) {
    console.error('Error fetching SOAP notes:', error);
    return {};
  }
};

// Fetch all dot phrases from backend
export const getAllDotPhrases = async () => {
  console.warn('getAllDotPhrases: Dot phrase API not implemented yet. Returning empty object.');
  return {};
};

// Save transcript to backend
export const saveTranscript = async (transcriptObj) => {
  const jwt = getJWT();
  try {
    const res = await fetch(`${API_BASE}/api/transcripts`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${jwt}` 
      },
      body: JSON.stringify(transcriptObj)
    });
    
    return await res.json();
  } catch (error) {
    console.error('Error saving transcript:', error);
    return { success: false, error: error.message };
  }
};

// Save SOAP note to backend
export const saveSoapNote = async (soapNoteObj) => {
  const jwt = getJWT();
  try {
    const res = await fetch(`${API_BASE}/api/soap-notes`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${jwt}` 
      },
      body: JSON.stringify(soapNoteObj)
    });
    
    return await res.json();
  } catch (error) {
    console.error('Error saving SOAP note:', error);
    return { success: false, error: error.message };
  }
};

// Save dot phrase to backend
export const saveDotPhrase = async (dotPhraseObj) => {
  console.warn('saveDotPhrase: Dot phrase API not implemented yet. Returning failure.');
  return { success: false, error: 'Dot phrase API not implemented' };
};

// Delete transcript by ID
export const deleteTranscript = async (id) => {
  const jwt = getJWT();
  try {
    const res = await fetch(`${API_BASE}/api/transcripts/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${jwt}` }
    });
    
    return await res.json();
  } catch (error) {
    console.error('Error deleting transcript:', error);
    return { success: false, error: error.message };
  }
};

// Delete SOAP note by ID
export const deleteSoapNote = async (id) => {
  const jwt = getJWT();
  try {
    const res = await fetch(`${API_BASE}/api/soap-notes/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${jwt}` }
    });
    
    return await res.json();
  } catch (error) {
    console.error('Error deleting SOAP note:', error);
    return { success: false, error: error.message };
  }
};

// Delete dot phrase by abbreviation or ID
export const deleteDotPhrase = async (id) => {
  console.warn('deleteDotPhrase: Dot phrase API not implemented yet. Returning failure.');
  return { success: false, error: 'Dot phrase API not implemented' };
};

// Search transcripts by text (client-side after fetching all)
export const searchTranscripts = async (query) => {
  const transcripts = await getAllTranscripts();
  const results = [];
  
  for (const [id, transcript] of Object.entries(transcripts)) {
    if (transcript.text?.toLowerCase().includes(query.toLowerCase()) ||
        transcript.chiefComplaint?.toLowerCase().includes(query.toLowerCase())) {
      results.push(transcript);
    }
  }
  
  return results.sort((a, b) => b.timestamp - a.timestamp);
};