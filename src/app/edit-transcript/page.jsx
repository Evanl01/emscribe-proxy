import React, { useEffect, useRef, useState } from 'react';
import * as api from '../../../public/scripts/api.js';
import * as ui from '../../../public/scripts/ui.js';
import * as format from '../../../public/scripts/format.js';
import * as validation from '../../../public/scripts/validation.js';

const EmScribeUtils = {
  ...api,
  ...ui,
  ...format,
  ...validation,
};

const EditTranscript = () => {
  // State for transcript fields
  const [transcriptId, setTranscriptId] = useState(null);
  const [transcriptText, setTranscriptText] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [patientId, setPatientId] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [stats, setStats] = useState({ words: 0, chars: 0, paragraphs: 0, readingTime: 0 });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [showSoapModal, setShowSoapModal] = useState(false);
  const [soapData, setSoapData] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [message, setMessage] = useState({ text: '', type: 'info', visible: false });

  // Refs for undo/redo
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const maxUndoStack = 50;
  const undoTimeout = useRef(null);

  // Load transcript on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
      loadTranscript(id);
    } else {
      const newId = EmScribeUtils.generateId();
      setTranscriptId(newId);
      setTimestamp(EmScribeUtils.formatTimestamp(Date.now()));
    }
    // eslint-disable-next-line
  }, []);

  // Update stats when transcriptText changes
  useEffect(() => {
    updateStats(transcriptText);
    // Debounced undo stack
    clearTimeout(undoTimeout.current);
    undoTimeout.current = setTimeout(() => {
      addToUndoStack(transcriptText);
    }, 1000);
    // eslint-disable-next-line
  }, [transcriptText]);

  const loadTranscript = async (id) => {
    try {
      const transcripts = await EmScribeUtils.getAllTranscripts();
      const transcript = transcripts[id];
      if (transcript) {
        setTranscriptId(id);
        setTranscriptText(transcript.text);
        setChiefComplaint(transcript.chiefComplaint || '');
        setPatientId(transcript.patientId || '');
        setTimestamp(EmScribeUtils.formatTimestamp(transcript.timestamp));
        addToUndoStack(transcript.text);
      } else {
        showMessage('Transcript not found', 'error');
        // Optionally navigate back
      }
    } catch (error) {
      showMessage('Error loading transcript', 'error');
    }
  };

  const updateStats = (text) => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const paragraphs = text.trim() ? text.split(/\n\s*\n/).length : 0;
    const readingTime = Math.ceil(words / 200);
    setStats({ words, chars, paragraphs, readingTime });
  };

  const addToUndoStack = (text) => {
    if (undoStack.current.length === 0 || undoStack.current[undoStack.current.length - 1] !== text) {
      undoStack.current.push(text);
      if (undoStack.current.length > maxUndoStack) {
        undoStack.current.shift();
      }
      redoStack.current = [];
    }
  };

  const undo = () => {
    if (undoStack.current.length > 1) {
      const currentText = undoStack.current.pop();
      redoStack.current.push(currentText);
      setTranscriptText(undoStack.current[undoStack.current.length - 1]);
      setHasUnsavedChanges(true);
    }
  };

  const redo = () => {
    if (redoStack.current.length > 0) {
      const text = redoStack.current.pop();
      undoStack.current.push(text);
      setTranscriptText(text);
      setHasUnsavedChanges(true);
    }
  };

  const handleTextChange = (e) => {
    setTranscriptText(e.target.value);
    setHasUnsavedChanges(true);
  };

  const handleChiefComplaintChange = (e) => {
    setChiefComplaint(e.target.value);
    setHasUnsavedChanges(true);
  };

  const handlePatientIdChange = (e) => {
    setPatientId(e.target.value);
    setHasUnsavedChanges(true);
  };

  const saveTranscript = async () => {
    const text = transcriptText.trim();
    if (!text) {
      showMessage('Cannot save empty transcript', 'error');
      return;
    }
    const validationResult = EmScribeUtils.validateTranscript(text);
    if (!validationResult.valid) {
      showMessage(validationResult.error, 'error');
      return;
    }
    const cc = chiefComplaint.trim() || EmScribeUtils.extractChiefComplaint(text);
    try {
      // Save logic: you may need to adapt this to your backend
      const result = await EmScribeUtils.saveTranscript(transcriptId, text, cc);
      if (result.success) {
        setHasUnsavedChanges(false);
        setChiefComplaint(cc);
        showMessage('Transcript saved successfully', 'success');
      } else {
        showMessage(result.error || 'Save failed', 'error');
      }
    } catch (error) {
      showMessage('Error saving transcript', 'error');
    }
  };

  const autoFormat = () => {
    let text = transcriptText;
    text = text
      .replace(/\s{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\.\s+([a-z])/g, (match, letter) => '. ' + letter.toUpperCase())
      .replace(/\bb\.?p\.?\s/gi, 'BP ')
      .replace(/\bhr\s/gi, 'HR ')
      .replace(/\brr\s/gi, 'RR ')
      .replace(/\bt°?\s/gi, 'temp ')
      .replace(/\bo2\s?sat/gi, 'O2 sat');
    setTranscriptText(text);
    showMessage('Text formatted', 'success');
  };

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type, visible: true });
    setTimeout(() => setMessage(m => ({ ...m, visible: false })), 2500);
  };

  // ...other handlers for SOAP, delete, modals, etc. (not shown for brevity)

  return (
    <div className="editor-container">
      <header className="editor-header">
        <div className="header-content">
          <div className="header-left">
            <button className="btn-icon back-btn" onClick={() => window.history.back()}>← Transcripts</button>
            <h1 id="pageTitle">📝 Edit Transcript</h1>
          </div>
          <div className="header-actions">
            <button className="btn btn-primary" onClick={saveTranscript}>💾 Save</button>
            <button className="btn btn-secondary">📋 Save & Generate SOAP</button>
          </div>
        </div>
      </header>
      <main className="editor-main">
        <div className="editor-sidebar">
          <div className="sidebar-section">
            <h3>Transcript Info</h3>
            <div className="form-group">
              <label>Created:</label>
              <input type="text" value={timestamp} readOnly className="form-input" />
            </div>
            <div className="form-group">
              <label>Chief Complaint:</label>
              <input type="text" value={chiefComplaint} onChange={handleChiefComplaintChange} placeholder="Enter chief complaint..." className="form-input" />
            </div>
            <div className="form-group">
              <label>Patient ID:</label>
              <input type="text" value={patientId} onChange={handlePatientIdChange} placeholder="Optional patient ID..." className="form-input" />
            </div>
          </div>
          <div className="sidebar-section">
            <h3>Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item"><span className="stat-label">Words:</span> <span className="stat-value">{stats.words}</span></div>
              <div className="stat-item"><span className="stat-label">Characters:</span> <span className="stat-value">{stats.chars}</span></div>
              <div className="stat-item"><span className="stat-label">Paragraphs:</span> <span className="stat-value">{stats.paragraphs}</span></div>
              <div className="stat-item"><span className="stat-label">Est. Reading:</span> <span className="stat-value">{stats.readingTime} min</span></div>
            </div>
          </div>
          <div className="sidebar-section">
            <h3>Formatting Tools</h3>
            <div className="formatting-tools">
              <button className="btn btn-outline btn-small" onClick={autoFormat}>📝 Auto Format</button>
              <button className="btn btn-outline btn-small" onClick={() => showMessage('Spell check coming soon', 'info')}>🔤 Spell Check</button>
              <button className="btn btn-outline btn-small" onClick={() => showMessage('Medical terms validation coming soon', 'info')}>🏥 Medical Terms</button>
            </div>
          </div>
          <div className="sidebar-section">
            <h3>Quick Actions</h3>
            <div className="quick-actions">
              <button className="btn btn-outline btn-small" onClick={() => showMessage('Duplicate coming soon', 'info')}>📋 Duplicate</button>
              <button className="btn btn-outline btn-small" onClick={() => showMessage('Export coming soon', 'info')}>📄 Export</button>
              <button className="btn btn-danger btn-small" onClick={() => setShowDeleteModal(true)}>🗑️ Delete</button>
            </div>
          </div>
        </div>
        <div className="editor-content">
          <div className="editor-toolbar">
            <div className="toolbar-group">
              <button className="toolbar-btn" onClick={undo} title="Undo (Ctrl+Z)">↶</button>
              <button className="toolbar-btn" onClick={redo} title="Redo (Ctrl+Y)">↷</button>
            </div>
            {/* ...other toolbar buttons... */}
          </div>
          <div className="editor-workspace">
            <div className="editor-panel">
              <div className="panel-header">
                <h4>Transcript Text</h4>
                {/* ...panel controls... */}
              </div>
              <div className="editor-wrapper">
                <textarea className="transcript-editor" value={transcriptText} onChange={handleTextChange} placeholder="Enter transcript text here..." />
                {/* ...line numbers, etc... */}
              </div>
            </div>
          </div>
        </div>
      </main>
      {/* Modals and Toasts (not fully implemented for brevity) */}
      {message.visible && (
        <div className={`toast toast-${message.type}`}>{message.text}</div>
      )}
    </div>
  );
};

export default EditTranscript;
