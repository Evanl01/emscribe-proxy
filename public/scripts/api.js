// lib/api.js - API-related functions
const API_BASE = process.env.NODE_ENV === 'development' ? '' : process.env.NEXT_PUBLIC_API_URL || '';

// Helper to get JWT from localStorage (client-side only)
export const getJWT = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('jwt');
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