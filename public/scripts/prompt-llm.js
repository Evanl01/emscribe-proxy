// ============================================
// FRONTEND: How to use the API

async function processAudioFile(audioFile, userId) {
  try {
    // Create FormData with the audio file
    const formData = new FormData();
    formData.append('audio_file', audioFile);
    formData.append('user_id', userId);

    // Start the request
    const response = await fetch('/api/process-recording', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Handle SSE stream for progress updates
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            handleProgressUpdate(data);
          } catch (parseError) {
            console.error('Error parsing SSE data:', parseError);
          }
        }
      }
    }
  } catch (error) {
    console.error('Processing error:', error);
    handleProgressUpdate({ 
      status: 'error', 
      message: `Connection failed: ${error.message}`
    });
  }
}

function handleProgressUpdate(data) {
  console.log('Progress update:', data);
  
  switch(data.status) {
    case 'started':
      updateUI('🚀 Processing started...');
      break;
    case 'parsing':
      updateUI('📁 Parsing uploaded file...');
      break;
    case 'processing':
      updateUI('⚡ Starting parallel processing...');
      break;
    case 'parallel_start':
      updateUI('🤖 AI analyzing while saving file...');
      break;
    case 'finalizing':
      updateUI('✨ Finalizing results...');
      break;
    case 'complete':
      updateUI('🎉 Processing complete!');
      displayResults(data.data);
      break;
    case 'error':
      updateUI(`❌ Error: ${data.message}`);
      showErrorMessage(data.message);
      break;
  }
}

function displayResults(data) {
  console.log('Recording ID:', data.recording_id);
  console.log('Transcript:', data.transcript);
  console.log('SOAP Note:', data.soapNote);
  console.log('Billing:', data.billingSuggestion);
  
  // Update your UI with the results
  document.getElementById('recording-id').textContent = data.recording_id;
  document.getElementById('transcript').textContent = data.transcript;
  // ... update other UI elements
}

function updateUI(message) {
  const statusElement = document.getElementById('status-message');
  if (statusElement) {
    statusElement.textContent = message;
  }
}

function showErrorMessage(message) {
  console.error('Processing failed:', message);
  // Show error notification to user
}

// Example usage:
// const fileInput = document.getElementById('audio-file-input');
// const audioFile = fileInput.files[0];
// await processAudioFile(audioFile, 'user123');