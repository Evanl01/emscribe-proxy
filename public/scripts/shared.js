// Shared utility functions for EmScribe extension

class EmScribeUtils {
  // Generate unique ID for transcripts/SOAP notes
  static generateId(userId = 'default') {
    const timestamp = Date.now();
    return `${timestamp}_${userId}`;
  }

  // Format timestamp for display
  static formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Format display name for transcript (timestamp_chief complaint)
  static formatDisplayName(timestamp, chiefComplaint = '') {
    const dateStr = this.formatTimestamp(timestamp);
    return chiefComplaint ? `${dateStr}_${chiefComplaint}` : dateStr;
  }

  // Extract chief complaint from transcript text
  static extractChiefComplaint(transcript) {
    // Simple extraction - look for common patterns
    const patterns = [
      /chief complaint[:\s]+(.+?)[\.\n]/i,
      /presenting with[:\s]+(.+?)[\.\n]/i,
      /complains? of[:\s]+(.+?)[\.\n]/i,
      /here for[:\s]+(.+?)[\.\n]/i
    ];

    for (const pattern of patterns) {
      const match = transcript.match(pattern);
      if (match) {
        return match[1].trim().substring(0, 50); // Limit to 50 chars
      }
    }

    // Fallback - use first sentence up to 50 chars
    const firstSentence = transcript.split('.')[0];
    return firstSentence ? firstSentence.substring(0, 50).trim() : 'No chief complaint';
  }

  // --- API-based methods ---

  // Helper to get JWT from localStorage
  static getJWT() {
    return localStorage.getItem('jwt');
  }

  // Fetch all transcripts from backend
  static async getAllTranscripts() {
    const jwt = this.getJWT();
    const res = await fetch('/api/transcripts', {
      headers: { 'Authorization': `Bearer ${jwt}` }
    });
    console.log('Response from /api/transcripts:', res);
    if (!res.ok) return {};
    return await res.json();
  }

  // Fetch all SOAP notes from backend
  static async getAllTranscripts() {
    const jwt = this.getJWT();
    const res = await fetch('/api/transcripts', {
      headers: { 'Authorization': `Bearer ${jwt}` }
    });
    let data;
    try {
      data = await res.json();
    } catch (e) {
      console.error('Error parsing /api/transcripts response as JSON:', e);
      return {};
    }
    console.log('Data from /api/transcripts:', data);
    if (!res.ok) return {};
    return data;
  }

  // Fetch all SOAP notes from backend
  static async getAllSoapNotes() {
    const jwt = this.getJWT();
    console.log('Fetching SOAP notes with JWT:', jwt);
    const res = await fetch('/api/soap-notes', {
      headers: { 'Authorization': `Bearer ${jwt}` }
    });
    try {
      let data = await res.json();

      console.log('Data from /api/soap-notes:', data);
      if (!res.ok) return {};
      return data;
    } catch (e) {
      console.error('Error parsing /api/soap-notes response as JSON:', e);
      return {};
    }
  }

  // Fetch all dot phrases from backend
  static async getAllDotPhrases() {
    console.warn('getAllDotPhrases: Dot phrase API not implemented yet. Returning empty object.');
    return {};

  }

  // Save transcript to backend
  static async saveTranscript(transcriptObj) {
    const jwt = this.getJWT();
    const res = await fetch('/api/transcripts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` },
      body: JSON.stringify(transcriptObj)
    });
    return await res.json();
  }

  // Save SOAP note to backend
  static async saveSoapNote(soapNoteObj) {
    const jwt = this.getJWT();
    const res = await fetch('/api/soap-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` },
      body: JSON.stringify(soapNoteObj)
    });
    return await res.json();
  }

  // Save dot phrase to backend
  static async saveDotPhrase(dotPhraseObj) {
    // TODO: Implement /api/dot-phrases POST endpoint in backend
    console.warn('saveDotPhrase: Dot phrase API not implemented yet. Returning failure.');
    return { success: false, error: 'Dot phrase API not implemented' };
  }

  // Delete transcript by ID
  static async deleteTranscript(id) {
    const jwt = this.getJWT();
    const res = await fetch(`/api/transcripts/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${jwt}` }
    });
    return await res.json();
  }

  // Delete SOAP note by ID
  static async deleteSoapNote(id) {
    const jwt = this.getJWT();
    const res = await fetch(`/api/soap-notes/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${jwt}` }
    });
    return await res.json();
  }

  // Delete dot phrase by abbreviation or ID
  static async deleteDotPhrase(id) {
    // TODO: Implement /api/dot-phrases DELETE endpoint in backend
    console.warn('deleteDotPhrase: Dot phrase API not implemented yet. Returning failure.');
    return { success: false, error: 'Dot phrase API not implemented' };

  }

  // Search transcripts by text (client-side after fetching all)
  static async searchTranscripts(query) {
    const transcripts = await this.getAllTranscripts();
    const results = [];
    for (const [id, transcript] of Object.entries(transcripts)) {
      if (transcript.text.toLowerCase().includes(query.toLowerCase()) ||
        (transcript.chiefComplaint && transcript.chiefComplaint.toLowerCase().includes(query.toLowerCase()))) {
        results.push(transcript);
      }
    }
    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Validate transcript data
  static validateTranscript(transcript) {
    if (!transcript || typeof transcript !== 'string') {
      return { valid: false, error: 'Transcript must be a non-empty string' };
    }

    if (transcript.length < 10) {
      return { valid: false, error: 'Transcript too short' };
    }

    return { valid: true };
  }

  // Validate SOAP note data
  static validateSoapNote(soapNote) {
    const requiredSections = ['subjective', 'objective', 'assessment', 'plan'];

    for (const section of requiredSections) {
      if (!soapNote[section] || typeof soapNote[section] !== 'string') {
        return { valid: false, error: `Missing or invalid ${section} section` };
      }
    }

    return { valid: true };
  }

  // Debounce function for search/input
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Show toast notification
  static showToast(message, type = 'info') {
    // Create toast element if it doesn't exist
    let toast = document.getElementById('emscribe-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'emscribe-toast';
      toast.className = 'emscribe-toast';
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = `emscribe-toast ${type} show`;

    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
}

// Make available globally
window.EmScribeUtils = EmScribeUtils;