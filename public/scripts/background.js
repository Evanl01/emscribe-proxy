
// Background service worker for EmScribe extension

chrome.runtime.onInstalled.addListener(() => {
  console.log('EmScribe extension installed');
  
  // Initialize storage with default settings
  chrome.storage.local.set({
    transcripts: {},
    soapNotes: {},
    dotPhrases: {},
    settings: {
      apiKeys: {
        whisper: '',
        gemini: ''
      },
      defaultTemplate: 'standard'
    }
  });
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'OPEN_TRANSCRIPTS':
      openTranscriptsPage();
      break;
    case 'OPEN_DASHBOARD':
      openDashboard();
      break;
    case 'SAVE_TRANSCRIPT':
      saveTranscript(message.data);
      break;
    case 'SAVE_SOAP_NOTE':
      saveSoapNote(message.data);
      break;
    default:
      console.log('Unknown message type:', message.type);
  }
});

// Open transcripts page in new tab
function openTranscriptsPage() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('pages/view-transcripts.html')
  });
}

// Open dashboard page in new tab
function openDashboard() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('pages/dashboard.html')
  });
}

// Save transcript to storage
async function saveTranscript(transcriptData) {
  try {
    const { transcripts } = await chrome.storage.local.get(['transcripts']);
    const updatedTranscripts = { ...transcripts };
    updatedTranscripts[transcriptData.id] = {
      ...transcriptData,
      lastModified: Date.now()
    };
    
    await chrome.storage.local.set({ transcripts: updatedTranscripts });
    console.log('Transcript saved:', transcriptData.id);
  } catch (error) {
    console.error('Error saving transcript:', error);
  }
}

// Save SOAP note to storage
async function saveSoapNote(soapData) {
  try {
    const { soapNotes } = await chrome.storage.local.get(['soapNotes']);
    const updatedSoapNotes = { ...soapNotes };
    updatedSoapNotes[soapData.id] = {
      ...soapData,
      lastModified: Date.now()
    };
    
    await chrome.storage.local.set({ soapNotes: updatedSoapNotes });
    console.log('SOAP note saved:', soapData.id);
  } catch (error) {
    console.error('Error saving SOAP note:', error);
  }
}