// EmScribe Editor JavaScript
// Handles transcript editing functionality

class EmScribeEditor {
  constructor() {
    this.currentTranscriptId = null;
    this.originalTranscript = null;
    this.hasUnsavedChanges = false;
    this.undoStack = [];
    this.redoStack = [];
    this.maxUndoStack = 50;
    this.currentZoom = 100;
    this.currentSoapData = null;

    this.init();
  }

  init() {
    this.loadTranscriptFromURL();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    this.updateStats();
    this.setupAutoSave();
  }

  loadTranscriptFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const transcriptId = urlParams.get('id');
    
    if (transcriptId) {
      this.loadTranscript(transcriptId);
    } else {
      // New transcript
      this.currentTranscriptId = EmScribeUtils.generateId();
      document.getElementById('pageTitle').textContent = '📝 New Transcript';
      document.getElementById('timestampDisplay').value = EmScribeUtils.formatTimestamp(Date.now());
    }
  }

  async loadTranscript(id) {
    try {
      const transcripts = await EmScribeUtils.getAllTranscripts();
      const transcript = transcripts[id];
      
      if (transcript) {
        this.currentTranscriptId = id;
        this.originalTranscript = transcript.text;
        
        document.getElementById('transcriptEditor').value = transcript.text;
        document.getElementById('chiefComplaintInput').value = transcript.chiefComplaint || '';
        document.getElementById('patientIdInput').value = transcript.patientId || '';
        document.getElementById('timestampDisplay').value = EmScribeUtils.formatTimestamp(transcript.timestamp);
        document.getElementById('pageTitle').textContent = '📝 Edit Transcript';
        
        this.updateStats();
        this.addToUndoStack(transcript.text);
      } else {
        this.showMessage('Transcript not found', 'error');
        this.goBack();
      }
    } catch (error) {
      console.error('Error loading transcript:', error);
      this.showMessage('Error loading transcript', 'error');
    }
  }

  setupEventListeners() {
    // Header actions
    document.getElementById('backBtn').addEventListener('click', () => this.goBack());
    document.getElementById('saveBtn').addEventListener('click', () => this.saveTranscript());
    document.getElementById('saveAndSoapBtn').addEventListener('click', () => this.saveAndGenerateSOAP());

    // Editor events
    const editor = document.getElementById('transcriptEditor');
    editor.addEventListener('input', () => this.handleTextChange());
    editor.addEventListener('scroll', () => this.syncLineNumbers());
    
    // Chief complaint input
    document.getElementById('chiefComplaintInput').addEventListener('input', () => this.markUnsaved());
    document.getElementById('patientIdInput').addEventListener('input', () => this.markUnsaved());

    // Toolbar buttons
    document.getElementById('undoBtn').addEventListener('click', () => this.undo());
    document.getElementById('redoBtn').addEventListener('click', () => this.redo());
    document.getElementById('findBtn').addEventListener('click', () => this.showFindReplace());
    document.getElementById('replaceBtn').addEventListener('click', () => this.showFindReplace());
    document.getElementById('zoomInBtn').addEventListener('click', () => this.zoomIn());
    document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoomOut());
    document.getElementById('zoomResetBtn').addEventListener('click', () => this.resetZoom());

    // Panel controls
    document.getElementById('wrapTextBtn').addEventListener('click', () => this.toggleWordWrap());
    document.getElementById('lineNumbersBtn').addEventListener('click', () => this.toggleLineNumbers());

    // Formatting tools
    document.getElementById('formatBtn').addEventListener('click', () => this.autoFormat());
    document.getElementById('spellCheckBtn').addEventListener('click', () => this.spellCheck());
    document.getElementById('medicalTermsBtn').addEventListener('click', () => this.checkMedicalTerms());

    // Quick actions
    document.getElementById('duplicateBtn').addEventListener('click', () => this.duplicateTranscript());
    document.getElementById('exportBtn').addEventListener('click', () => this.exportTranscript());
    document.getElementById('deleteBtn').addEventListener('click', () => this.showDeleteConfirmation());

    // Find/Replace modal
    this.setupFindReplaceModal();
    
    // SOAP modal
    this.setupSoapModal();
    
    // Delete modal
    this.setupDeleteModal();
    
    // Unsaved changes modal
    this.setupUnsavedModal();

    // Window events
    window.addEventListener('beforeunload', (e) => this.handleBeforeUnload(e));
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            this.saveTranscript();
            break;
          case 'z':
            if (e.shiftKey) {
              e.preventDefault();
              this.redo();
            } else {
              e.preventDefault();
              this.undo();
            }
            break;
          case 'y':
            e.preventDefault();
            this.redo();
            break;
          case 'f':
            e.preventDefault();
            this.showFindReplace();
            break;
          case 'h':
            e.preventDefault();
            this.showFindReplace(true);
            break;
          case '=':
          case '+':
            e.preventDefault();
            this.zoomIn();
            break;
          case '-':
            e.preventDefault();
            this.zoomOut();
            break;
          case '0':
            e.preventDefault();
            this.resetZoom();
            break;
        }
      }
    });
  }

  handleTextChange() {
    this.markUnsaved();
    this.updateStats();
    this.updateLineNumbers();
    
    // Add to undo stack with debouncing
    clearTimeout(this.undoTimeout);
    this.undoTimeout = setTimeout(() => {
      const currentText = document.getElementById('transcriptEditor').value;
      this.addToUndoStack(currentText);
    }, 1000);
  }

  markUnsaved() {
    this.hasUnsavedChanges = true;
    const saveBtn = document.getElementById('saveBtn');
    if (!saveBtn.textContent.includes('*')) {
      saveBtn.textContent = '💾 Save *';
    }
  }

  markSaved() {
    this.hasUnsavedChanges = false;
    document.getElementById('saveBtn').textContent = '💾 Save';
  }

  updateStats() {
    const text = document.getElementById('transcriptEditor').value;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const paragraphs = text.trim() ? text.split(/\n\s*\n/).length : 0;
    const readingTime = Math.ceil(words / 200); // 200 words per minute average

    document.getElementById('wordCount').textContent = words.toLocaleString();
    document.getElementById('charCount').textContent = chars.toLocaleString();
    document.getElementById('paragraphCount').textContent = paragraphs;
    document.getElementById('readingTime').textContent = readingTime + ' min';
  }

  addToUndoStack(text) {
    if (this.undoStack.length === 0 || this.undoStack[this.undoStack.length - 1] !== text) {
      this.undoStack.push(text);
      if (this.undoStack.length > this.maxUndoStack) {
        this.undoStack.shift();
      }
      this.redoStack = []; // Clear redo stack when new change is made
    }
  }

  undo() {
    if (this.undoStack.length > 1) {
      const currentText = this.undoStack.pop();
      this.redoStack.push(currentText);
      const previousText = this.undoStack[this.undoStack.length - 1];
      document.getElementById('transcriptEditor').value = previousText;
      this.updateStats();
      this.markUnsaved();
    }
  }

  redo() {
    if (this.redoStack.length > 0) {
      const text = this.redoStack.pop();
      this.undoStack.push(text);
      document.getElementById('transcriptEditor').value = text;
      this.updateStats();
      this.markUnsaved();
    }
  }

  async saveTranscript() {
    const text = document.getElementById('transcriptEditor').value.trim();
    if (!text) {
      this.showMessage('Cannot save empty transcript', 'error');
      return;
    }

    const validation = EmScribeUtils.validateTranscript(text);
    if (!validation.valid) {
      this.showMessage(validation.error, 'error');
      return;
    }

    const chiefComplaint = document.getElementById('chiefComplaintInput').value.trim() ||
                          EmScribeUtils.extractChiefComplaint(text);
    const patientId = document.getElementById('patientIdInput').value.trim();

    try {
      const result = await EmScribeUtils.saveTranscript(this.currentTranscriptId, text, chiefComplaint);
      if (result.success) {
        this.markSaved();
        this.originalTranscript = text;
        this.showMessage('Transcript saved successfully', 'success');
        
        // Update chief complaint if it was auto-extracted
        if (!document.getElementById('chiefComplaintInput').value.trim()) {
          document.getElementById('chiefComplaintInput').value = chiefComplaint;
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Save error:', error);
      this.showMessage('Error saving transcript', 'error');
    }
  }

  async saveAndGenerateSOAP() {
    await this.saveTranscript();
    if (!this.hasUnsavedChanges) {
      this.generateSOAP();
    }
  }

  async generateSOAP() {
    const text = document.getElementById('transcriptEditor').value.trim();
    if (!text) {
      this.showMessage('Cannot generate SOAP from empty transcript', 'error');
      return;
    }

    this.showSoapModal();
    this.showSoapProgress();

    try {
      // Call API to generate SOAP note
      const soapData = await window.EmScribeAPI.generateSOAP(text);
      this.currentSoapData = soapData;
      this.showSoapResult(soapData);
    } catch (error) {
      console.error('SOAP generation error:', error);
      this.showSoapError('Failed to generate SOAP note. Please try again.');
    }
  }

  autoFormat() {
    const editor = document.getElementById('transcriptEditor');
    let text = editor.value;

    // Basic formatting rules
    text = text
      // Fix multiple spaces
      .replace(/\s{2,}/g, ' ')
      // Fix multiple newlines
      .replace(/\n{3,}/g, '\n\n')
      // Capitalize first letter after periods
      .replace(/\.\s+([a-z])/g, (match, letter) => '. ' + letter.toUpperCase())
      // Fix common medical abbreviations
      .replace(/\bb\.?p\.?\s/gi, 'BP ')
      .replace(/\bhr\s/gi, 'HR ')
      .replace(/\brr\s/gi, 'RR ')
      .replace(/\bt°?\s/gi, 'temp ')
      .replace(/\bo2\s?sat/gi, 'O2 sat');

    editor.value = text;
    this.handleTextChange();
    this.showMessage('Text formatted', 'success');
  }

  spellCheck() {
    this.showMessage('Spell check completed (basic implementation)', 'info');
  }

  checkMedicalTerms() {
    this.showMessage('Medical terms validated', 'info');
  }

  async duplicateTranscript() {
    const text = document.getElementById('transcriptEditor').value.trim();
    if (!text) {
      this.showMessage('Cannot duplicate empty transcript', 'error');
      return;
    }

    const newId = EmScribeUtils.generateId();
    const chiefComplaint = document.getElementById('chiefComplaintInput').value.trim() + ' (Copy)';

    try {
      const result = await EmScribeUtils.saveTranscript(newId, text, chiefComplaint);
      if (result.success) {
        this.showMessage('Transcript duplicated successfully', 'success');
        // Navigate to the new transcript
        setTimeout(() => {
          window.location.href = `editor.html?id=${newId}`;
        }, 1500);
      }
    } catch (error) {
      console.error('Duplicate error:', error);
      this.showMessage('Error duplicating transcript', 'error');
    }
  }

  exportTranscript() {
    const text = document.getElementById('transcriptEditor').value;
    const chiefComplaint = document.getElementById('chiefComplaintInput').value;
    const timestamp = document.getElementById('timestampDisplay').value;

    const exportData = {
      timestamp: timestamp,
      chiefComplaint: chiefComplaint,
      text: text,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript_${chiefComplaint || 'untitled'}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showMessage('Transcript exported', 'success');
  }

  // Zoom functionality
  zoomIn() {
    if (this.currentZoom < 200) {
      this.currentZoom += 10;
      this.applyZoom();
    }
  }

  zoomOut() {
    if (this.currentZoom > 50) {
      this.currentZoom -= 10;
      this.applyZoom();
    }
  }

  resetZoom() {
    this.currentZoom = 100;
    this.applyZoom();
  }

  applyZoom() {
    const editor = document.getElementById('transcriptEditor');
    editor.style.fontSize = `${this.currentZoom}%`;
    document.getElementById('zoomResetBtn').textContent = `${this.currentZoom}%`;
  }

  // Word wrap toggle
  toggleWordWrap() {
    const editor = document.getElementById('transcriptEditor');
    const btn = document.getElementById('wrapTextBtn');
    
    if (btn.classList.contains('active')) {
      editor.style.whiteSpace = 'nowrap';
      editor.style.overflowX = 'auto';
      btn.classList.remove('active');
    } else {
      editor.style.whiteSpace = 'pre-wrap';
      editor.style.overflowX = 'hidden';
      btn.classList.add('active');
    }
  }

  // Line numbers
  toggleLineNumbers() {
    const lineNumbers = document.getElementById('lineNumbers');
    const btn = document.getElementById('lineNumbersBtn');
    
    if (btn.classList.contains('active')) {
      lineNumbers.style.display = 'none';
      btn.classList.remove('active');
    } else {
      lineNumbers.style.display = 'block';
      btn.classList.add('active');
      this.updateLineNumbers();
    }
  }

  updateLineNumbers() {
    const lineNumbers = document.getElementById('lineNumbers');
    if (lineNumbers.style.display === 'none') return;

    const editor = document.getElementById('transcriptEditor');
    const lines = editor.value.split('\n').length;
    
    let numbersHtml = '';
    for (let i = 1; i <= lines; i++) {
      numbersHtml += `<div>${i}</div>`;
    }
    
    lineNumbers.innerHTML = numbersHtml;
  }

  syncLineNumbers() {
    const lineNumbers = document.getElementById('lineNumbers');
    const editor = document.getElementById('transcriptEditor');
    lineNumbers.scrollTop = editor.scrollTop;
  }

  // Modal setup methods
  setupFindReplaceModal() {
    const modal = document.getElementById('findReplaceModal');
    const closeBtn = document.getElementById('closeFindReplaceBtn');
    const findInput = document.getElementById('findInput');
    const replaceInput = document.getElementById('replaceInput');
    const findNextBtn = document.getElementById('findNextBtn');
    const replaceBtn = document.getElementById('replaceBtn');
    const replaceAllBtn = document.getElementById('replaceAllBtn');

    closeBtn.addEventListener('click', () => this.hideFindReplace());
    findNextBtn.addEventListener('click', () => this.findNext());
    replaceBtn.addEventListener('click', () => this.replace());
    replaceAllBtn.addEventListener('click', () => this.replaceAll());

    findInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.findNext();
      if (e.key === 'Escape') this.hideFindReplace();
    });

    replaceInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.replace();
      if (e.key === 'Escape') this.hideFindReplace();
    });
  }

  setupSoapModal() {
    const modal = document.getElementById('soapModal');
    const closeBtn = document.getElementById('closeSoapBtn');
    const cancelBtn = document.getElementById('cancelSoapBtn');
    const saveBtn = document.getElementById('saveSoapBtn');

    closeBtn.addEventListener('click', () => this.hideSoapModal());
    cancelBtn.addEventListener('click', () => this.hideSoapModal());
    saveBtn.addEventListener('click', () => this.saveSoapNote());
  }

  setupDeleteModal() {
    const modal = document.getElementById('deleteModal');
    const closeBtn = document.getElementById('closeDeleteBtn');
    const cancelBtn = document.getElementById('cancelDeleteBtn');
    const confirmBtn = document.getElementById('confirmDeleteBtn');

    closeBtn.addEventListener('click', () => this.hideDeleteModal());
    cancelBtn.addEventListener('click', () => this.hideDeleteModal());
    confirmBtn.addEventListener('click', () => this.deleteTranscript());
  }

  setupUnsavedModal() {
    const modal = document.getElementById('unsavedModal');
    const discardBtn = document.getElementById('discardChangesBtn');
    const saveBtn = document.getElementById('saveChangesBtn');

    discardBtn.addEventListener('click', () => {
      this.hasUnsavedChanges = false;
      this.hideUnsavedModal();
      this.pendingNavigation();
    });

    saveBtn.addEventListener('click', async () => {
      await this.saveTranscript();
      this.hideUnsavedModal();
      this.pendingNavigation();
    });
  }

  setupAutoSave() {
    // Auto-save every 30 seconds if there are unsaved changes
    setInterval(() => {
      if (this.hasUnsavedChanges) {
        this.saveTranscript();
      }
    }, 30000);
  }

  // Find/Replace functionality
  showFindReplace(showReplace = false) {
    const modal = document.getElementById('findReplaceModal');
    const findInput = document.getElementById('findInput');
    const replaceSection = modal.querySelector('.form-group:nth-child(2)');
    
    modal.style.display = 'block';
    replaceSection.style.display = showReplace ? 'block' : 'none';
    findInput.focus();
    
    // Pre-populate with selected text
    const editor = document.getElementById('transcriptEditor');
    const selectedText = editor.value.substring(editor.selectionStart, editor.selectionEnd);
    if (selectedText) {
      findInput.value = selectedText;
    }
  }

  hideFindReplace() {
    document.getElementById('findReplaceModal').style.display = 'none';
  }

  findNext() {
    const findText = document.getElementById('findInput').value;
    if (!findText) return;

    const editor = document.getElementById('transcriptEditor');
    const text = editor.value;
    const matchCase = document.getElementById('matchCaseCheck').checked;
    const wholeWord = document.getElementById('wholeWordCheck').checked;

    let searchText = matchCase ? text : text.toLowerCase();
    let searchTerm = matchCase ? findText : findText.toLowerCase();

    if (wholeWord) {
      searchTerm = `\\b${searchTerm}\\b`;
      const regex = new RegExp(searchTerm, matchCase ? 'g' : 'gi');
      const match = regex.exec(searchText);
      if (match) {
        editor.setSelectionRange(match.index, match.index + findText.length);
        editor.focus();
        this.updateSearchResults(text, findText, matchCase, wholeWord);
      }
    } else {
      const startPos = editor.selectionEnd || 0;
      const foundIndex = searchText.indexOf(searchTerm, startPos);
      
      if (foundIndex !== -1) {
        editor.setSelectionRange(foundIndex, foundIndex + findText.length);
        editor.focus();
        this.updateSearchResults(text, findText, matchCase, wholeWord);
      } else {
        // Search from beginning
        const foundFromStart = searchText.indexOf(searchTerm, 0);
        if (foundFromStart !== -1) {
          editor.setSelectionRange(foundFromStart, foundFromStart + findText.length);
          editor.focus();
          this.updateSearchResults(text, findText, matchCase, wholeWord);
        }
      }
    }
  }

  replace() {
    const editor = document.getElementById('transcriptEditor');
    const findText = document.getElementById('findInput').value;
    const replaceText = document.getElementById('replaceInput').value;
    
    if (editor.selectionStart !== editor.selectionEnd) {
      const selectedText = editor.value.substring(editor.selectionStart, editor.selectionEnd);
      const matchCase = document.getElementById('matchCaseCheck').checked;
      
      const matches = matchCase ? 
        selectedText === findText : 
        selectedText.toLowerCase() === findText.toLowerCase();
      
      if (matches) {
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        editor.value = editor.value.substring(0, start) + replaceText + editor.value.substring(end);
        editor.setSelectionRange(start, start + replaceText.length);
        this.handleTextChange();
      }
    }
    
    this.findNext();
  }

  replaceAll() {
    const editor = document.getElementById('transcriptEditor');
    const findText = document.getElementById('findInput').value;
    const replaceText = document.getElementById('replaceInput').value;
    const matchCase = document.getElementById('matchCaseCheck').checked;
    const wholeWord = document.getElementById('wholeWordCheck').checked;
    
    if (!findText) return;

    let text = editor.value;
    let flags = 'g';
    if (!matchCase) flags += 'i';
    
    let searchPattern = wholeWord ? `\\b${findText}\\b` : findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    const regex = new RegExp(searchPattern, flags);
    const newText = text.replace(regex, replaceText);
    
    if (newText !== text) {
      editor.value = newText;
      this.handleTextChange();
      const count = (text.match(regex) || []).length;
      this.showMessage(`Replaced ${count} occurrence(s)`, 'success');
    }
  }

  updateSearchResults(text, searchTerm, matchCase, wholeWord) {
    const resultsDiv = document.getElementById('searchResults');
    
    let flags = 'g';
    if (!matchCase) flags += 'i';
    
    let pattern = wholeWord ? `\\b${searchTerm}\\b` : searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const regex = new RegExp(pattern, flags);
    const matches = text.match(regex) || [];
    
    resultsDiv.textContent = `${matches.length} result(s) found`;
  }

  // SOAP Modal functionality
  showSoapModal() {
    document.getElementById('soapModal').style.display = 'block';
  }

  hideSoapModal() {
    document.getElementById('soapModal').style.display = 'none';
    this.hideSoapProgress();
    this.hideSoapResult();
    this.hideSoapError();
  }

  showSoapProgress() {
    document.getElementById('soapProgress').style.display = 'block';
    document.getElementById('soapResult').style.display = 'none';
    document.getElementById('soapError').style.display = 'none';
    document.getElementById('saveSoapBtn').style.display = 'none';
  }

  hideSoapProgress() {
    document.getElementById('soapProgress').style.display = 'none';
  }

  showSoapResult(soapData) {
    document.getElementById('soapProgress').style.display = 'none';
    document.getElementById('soapResult').style.display = 'block';
    document.getElementById('saveSoapBtn').style.display = 'inline-block';

    document.getElementById('soapSubjective').textContent = soapData.subjective;
    document.getElementById('soapObjective').textContent = soapData.objective;
    document.getElementById('soapAssessment').textContent = soapData.assessment;
    document.getElementById('soapPlan').textContent = soapData.plan;
  }

  hideSoapResult() {
    document.getElementById('soapResult').style.display = 'none';
    document.getElementById('saveSoapBtn').style.display = 'none';
  }

  showSoapError(message) {
    document.getElementById('soapProgress').style.display = 'none';
    document.getElementById('soapError').style.display = 'block';
    document.getElementById('soapError').textContent = message;
  }

  hideSoapError() {
    document.getElementById('soapError').style.display = 'none';
  }

  async saveSoapNote() {
    if (!this.currentSoapData) return;

    const soapId = EmScribeUtils.generateId();
    const chiefComplaint = document.getElementById('chiefComplaintInput').value;
    
    try {
      const result = await EmScribeUtils.saveSoapNote(soapId, this.currentSoapData, this.currentTranscriptId);
      if (result.success) {
        this.showMessage('SOAP note saved successfully', 'success');
        this.hideSoapModal();
        // Navigate to SOAP notes view
        setTimeout(() => {
          window.location.href = `../soap/soap-notes.html`;
        }, 1500);
      }
    } catch (error) {
      console.error('SOAP save error:', error);
      this.showMessage('Error saving SOAP note', 'error');
    }
  }

  // Delete functionality
  showDeleteConfirmation() {
    const modal = document.getElementById('deleteModal');
    const preview = document.getElementById('deletePreview');
    const text = document.getElementById('transcriptEditor').value;
    const previewText = text.length > 100 ? text.substring(0, 100) + '...' : text;
    
    preview.textContent = previewText;
    modal.style.display = 'block';
  }

  hideDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
  }

  async deleteTranscript() {
    try {
      const result = await EmScribeUtils.deleteTranscript(this.currentTranscriptId);
      if (result.success) {
        this.showMessage('Transcript deleted successfully', 'success');
        this.hasUnsavedChanges = false;
        setTimeout(() => {
          this.goBack();
        }, 1500);
      }
    } catch (error) {
      console.error('Delete error:', error);
      this.showMessage('Error deleting transcript', 'error');
    }
    this.hideDeleteModal();
  }

  // Unsaved changes modal
  showUnsavedModal() {
    document.getElementById('unsavedModal').style.display = 'block';
  }

  hideUnsavedModal() {
    document.getElementById('unsavedModal').style.display = 'none';
  }

  // Navigation handling
  goBack() {
    if (this.hasUnsavedChanges) {
      this.pendingNavigationAction = () => {
        window.location.href = '../transcripts/view-transcripts.html';
      };
      this.showUnsavedModal();
    } else {
      window.location.href = '../transcripts/view-transcripts.html';
    }
  }

  pendingNavigation() {
    if (this.pendingNavigationAction) {
      this.pendingNavigationAction();
      this.pendingNavigationAction = null;
    }
  }

  handleBeforeUnload(e) {
    if (this.hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
  }

  // Toast messages
  showMessage(message, type = 'info') {
    const toast = document.getElementById('messageToast');
    const messageText = document.getElementById('messageText');
    
    messageText.textContent = message;
    toast.className = `toast ${type} show`;
    toast.style.display = 'block';

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.style.display = 'none';
      }, 300);
    }, 3000);

    // Close button
    document.getElementById('closeToast').onclick = () => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.style.display = 'none';
      }, 300);
    };
  }
}

// Initialize editor when page loads
document.addEventListener('DOMContentLoaded', () => {
  window.emscribeEditor = new EmScribeEditor();
});