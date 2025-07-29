class TranscriptsPage {
    constructor() {
        this.transcripts = {};
        this.filteredTranscripts = [];
        this.currentTranscript = null;
        this.searchDebounced = EmScribeUtils.debounce(this.performSearch.bind(this), 300);
        this.init();
    }

    async init() {
        await this.loadTranscripts();
        this.bindEvents();
        this.checkUrlParams();
    }

    async loadTranscripts() {
        this.transcripts = await EmScribeUtils.getAllTranscripts();
        this.filteredTranscripts = Object.values(this.transcripts);
        this.renderTranscripts();
    }

    checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const transcriptId = urlParams.get('id');
        const mode = urlParams.get('mode');

        if (transcriptId && this.transcripts[transcriptId]) {
            if (mode === 'view') {
                this.viewTranscript(transcriptId);
            }
        }
    }

    renderTranscripts() {
        const container = document.getElementById('transcriptsList');
        const emptyState = document.getElementById('emptyState');

        if (this.filteredTranscripts.length === 0) {
            container.style.display = 'none';
            emptyState.style.display = 'flex';
            return;
        }

        container.style.display = 'block';
        emptyState.style.display = 'none';

        container.innerHTML = this.filteredTranscripts.map(transcript => `
                    <div class="transcript-card" data-id="${transcript.id}">
                        <div class="card-header">
                            <div class="card-title">
                                ${EmScribeUtils.formatDisplayName(transcript.timestamp, transcript.chiefComplaint)}
                            </div>
                            <div class="card-actions">
                                <button class="btn-icon view-btn" title="View Full Screen" data-id="${transcript.id}">👁️</button>
                                <button class="btn-icon edit-btn" title="Edit" data-id="${transcript.id}">✏️</button>
                                <button class="btn-icon soap-btn" title="Generate SOAP" data-id="${transcript.id}">📋</button>
                                <button class="btn-icon delete-btn" title="Delete" data-id="${transcript.id}">🗑️</button>
                            </div>
                        </div>
                        <div class="card-meta">
                            <span class="meta-item">📅 ${EmScribeUtils.formatTimestamp(transcript.timestamp)}</span>
                            <span class="meta-item">📝 ${transcript.text.split(' ').length} words</span>
                            <span class="meta-item">🏥 ${transcript.chiefComplaint || 'No chief complaint'}</span>
                        </div>
                        <div class="card-preview">
                            ${transcript.text.substring(0, 200)}${transcript.text.length > 200 ? '...' : ''}
                        </div>
                    </div>
                `).join('');
    }

    bindEvents() {
        // Back button
        document.getElementById('backBtn').addEventListener('click', () => {
            chrome.tabs.create({ url: chrome.runtime.getURL('pages/dashboard.html') });
        });

        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchDebounced(e.target.value);
        });

        // Filters
        document.getElementById('sortSelect').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('dateFilter').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('clearFiltersBtn').addEventListener('click', () => {
            this.clearFilters();
        });

        // Transcript actions
        document.addEventListener('click', (e) => {
            const transcriptId = e.target.dataset.id;

            if (e.target.classList.contains('view-btn')) {
                this.viewTranscript(transcriptId);
            } else if (e.target.classList.contains('edit-btn')) {
                this.editTranscript(transcriptId);
            } else if (e.target.classList.contains('soap-btn')) {
                this.generateSoap(transcriptId);
            } else if (e.target.classList.contains('delete-btn')) {
                this.deleteTranscript(transcriptId);
            }
        });

        // Viewer controls
        document.getElementById('closeViewerBtn').addEventListener('click', () => {
            this.closeViewer();
        });

        document.getElementById('editTranscriptBtn').addEventListener('click', () => {
            this.editCurrentTranscript();
        });

        document.getElementById('generateSoapBtn').addEventListener('click', () => {
            this.generateSoapForCurrent();
        });

        // Modal controls
        this.bindModalEvents();
    }

    bindModalEvents() {
        // Delete modal
        document.getElementById('closeDeleteBtn').addEventListener('click', () => {
            this.closeModal('deleteModal');
        });

        document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
            this.closeModal('deleteModal');
        });

        document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
            this.confirmDelete();
        });

        // SOAP modal
        document.getElementById('closeSoapBtn').addEventListener('click', () => {
            this.closeModal('soapModal');
        });

        document.getElementById('cancelSoapBtn').addEventListener('click', () => {
            this.closeModal('soapModal');
        });

        document.getElementById('saveSoapBtn').addEventListener('click', () => {
            this.saveSoapNote();
        });
    }

    async performSearch(query) {
        if (!query.trim()) {
            this.filteredTranscripts = Object.values(this.transcripts);
        } else {
            this.filteredTranscripts = await EmScribeUtils.searchTranscripts(query);
        }
        this.applyFilters();
    }

    applyFilters() {
        const sortBy = document.getElementById('sortSelect').value;
        const dateFilter = document.getElementById('dateFilter').value;

        let filtered = [...this.filteredTranscripts];

        // Apply date filter
        if (dateFilter !== 'all') {
            const now = new Date();
            let cutoffDate;

            switch (dateFilter) {
                case 'today':
                    cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'week':
                    cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'month':
                    cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                case 'year':
                    cutoffDate = new Date(now.getFullYear(), 0, 1);
                    break;
            }

            filtered = filtered.filter(t => t.timestamp >= cutoffDate.getTime());
        }

        // Apply sorting
        switch (sortBy) {
            case 'newest':
                filtered.sort((a, b) => b.timestamp - a.timestamp);
                break;
            case 'oldest':
                filtered.sort((a, b) => a.timestamp - b.timestamp);
                break;
            case 'complaint':
                filtered.sort((a, b) => (a.chiefComplaint || '').localeCompare(b.chiefComplaint || ''));
                break;
            case 'modified':
                filtered.sort((a, b) => (b.lastModified || b.timestamp) - (a.lastModified || a.timestamp));
                break;
        }

        this.filteredTranscripts = filtered;
        this.renderTranscripts();
    }

    clearFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('sortSelect').value = 'newest';
        document.getElementById('dateFilter').value = 'all';
        this.filteredTranscripts = Object.values(this.transcripts);
        this.applyFilters();
    }

    viewTranscript(id) {
        const transcript = this.transcripts[id];
        if (!transcript) return;

        this.currentTranscript = transcript;

        document.getElementById('viewerTitle').textContent =
            EmScribeUtils.formatDisplayName(transcript.timestamp, transcript.chiefComplaint);
        document.getElementById('viewerTimestamp').textContent =
            EmScribeUtils.formatTimestamp(transcript.timestamp);
        document.getElementById('viewerChiefComplaint').textContent =
            transcript.chiefComplaint || 'Not specified';
        document.getElementById('viewerWordCount').textContent =
            transcript.text.split(' ').length;
        document.getElementById('viewerText').textContent = transcript.text;

        document.getElementById('transcriptViewer').style.display = 'block';
        document.getElementById('transcriptsList').style.display = 'none';
    }

    closeViewer() {
        document.getElementById('transcriptViewer').style.display = 'none';
        document.getElementById('transcriptsList').style.display = 'block';
        this.currentTranscript = null;
    }

    editTranscript(id) {
        const url = chrome.runtime.getURL(`pages/edit-transcript.html?id=${id}`);
        chrome.tabs.create({ url });
    }

    editCurrentTranscript() {
        if (this.currentTranscript) {
            this.editTranscript(this.currentTranscript.id);
        }
    }

    async generateSoap(id) {
        this.currentTranscriptForSoap = this.transcripts[id];
        this.showModal('soapModal');

        document.getElementById('soapProgress').style.display = 'block';
        document.getElementById('soapResult').style.display = 'none';
        document.getElementById('soapError').style.display = 'none';

        try {
            const api = new EmScribeAPI();
            const result = await api.generateSoapNote(this.currentTranscriptForSoap.text);

            if (result.success) {
                this.displaySoapResult(result.soapNote);
            } else {
                this.showSoapError(result.error);
            }
        } catch (error) {
            this.showSoapError('Failed to generate SOAP note');
        }

        document.getElementById('soapProgress').style.display = 'none';
    }

    generateSoapForCurrent() {
        if (this.currentTranscript) {
            this.generateSoap(this.currentTranscript.id);
        }
    }

    displaySoapResult(soapNote) {
        document.getElementById('soapSubjective').textContent = soapNote.subjective;
        document.getElementById('soapObjective').textContent = soapNote.objective;
        document.getElementById('soapAssessment').textContent = soapNote.assessment;
        document.getElementById('soapPlan').textContent = soapNote.plan;

        document.getElementById('soapResult').style.display = 'block';
        document.getElementById('saveSoapBtn').style.display = 'inline-block';
        this.generatedSoapNote = soapNote;
    }

    showSoapError(error) {
        document.getElementById('soapError').textContent = error;
        document.getElementById('soapError').style.display = 'block';
    }

    async saveSoapNote() {
        if (this.generatedSoapNote && this.currentTranscriptForSoap) {
            const id = EmScribeUtils.generateId();
            await EmScribeUtils.saveSoapNote(id, this.generatedSoapNote, this.currentTranscriptForSoap.id);

            EmScribeUtils.showToast('SOAP note saved successfully!', 'success');
            this.closeModal('soapModal');
        }
    }

    deleteTranscript(id) {
        const transcript = this.transcripts[id];
        if (!transcript) return;

        this.transcriptToDelete = transcript;
        document.getElementById('deletePreview').innerHTML = `
                    <strong>${EmScribeUtils.formatDisplayName(transcript.timestamp, transcript.chiefComplaint)}</strong>
                    <div class="preview-text">${transcript.text.substring(0, 100)}...</div>
                `;

        this.showModal('deleteModal');
    }

    async confirmDelete() {
        if (this.transcriptToDelete) {
            await EmScribeUtils.deleteTranscript(this.transcriptToDelete.id);
            delete this.transcripts[this.transcriptToDelete.id];

            this.filteredTranscripts = this.filteredTranscripts.filter(
                t => t.id !== this.transcriptToDelete.id
            );

            this.renderTranscripts();
            EmScribeUtils.showToast('Transcript deleted successfully!', 'success');

            this.closeModal('deleteModal');
            this.transcriptToDelete = null;
        }
    }

    showModal(modalId) {
        document.getElementById(modalId).style.display = 'flex';
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }
}

// Initialize page when loaded
document.addEventListener('DOMContentLoaded', () => {
    new TranscriptsPage();
});