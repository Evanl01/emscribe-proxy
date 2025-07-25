// Backend: /api/process-recording.js

import { supabase } from '@/src/utils/supabase';
import formidable from 'formidable';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const recordingTableName = 'recordings';

// Schema types for Gemini structured output
const SchemaType = {
  OBJECT: "object",
  STRING: "string"
};

let response = {
  status: '',      // e.g. 'started', 'processing', 'error', etc.
  message: '',     // e.g. 'Processing started...', etc.
  data: {}         // any additional data you want to send
};

// Disable Next.js body parsing to handle multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set up SSE headers for progress updates
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  });

  try {
    // Send immediate acknowledgment
    response.status = 'started';
    response.message = 'Processing started...';
    res.write(`data: ${JSON.stringify(response)}\n\n`);

    // Parse multipart form data
    const form = formidable({
      maxFileSize: 30 * 1024 * 1024, // 30MB limit
      keepExtensions: true,
      filter: ({ mimetype }) => mimetype && mimetype.includes('audio'),
    });

    response.status = 'parsing';
    response.message = 'Parsing uploaded file...';
    res.write(`data: ${JSON.stringify(response)}\n\n`);

    const [fields, files] = await form.parse(req);
    const audioFile = Array.isArray(files.audio_file) ? files.audio_file[0] : files.audio_file;

    if (!audioFile) {
      response.status = 'error';
      response.message = 'No audio file provided';
      res.write(`data: ${JSON.stringify(response)}\n\n`);
      res.end();
      return;
    }

    // Validate file type
    if (!audioFile.mimetype || !audioFile.mimetype.includes('audio/mp3') && !audioFile.mimetype.includes('audio/mpeg')) {
      response.status = 'error';
      response.message = 'File must be MP3 format';
      res.write(`data: ${JSON.stringify(response)}\n\n`);
      res.end();
      return;
    }

    response.status = 'processing';
    response.message = 'Starting parallel processing...';
    res.write(`data: ${JSON.stringify(response)}\n\n`);

    
    // Read file data
    const audioBuffer = fs.readFileSync(audioFile.filepath);
    const base64Audio = audioBuffer.toString('base64');

    // Generate unique identifiers
    const recordingId = uuidv4();
    const timestamp = Date.now();
    const userId = fields.user_id ? (Array.isArray(fields.user_id) ? fields.user_id[0] : fields.user_id) : 'anonymous';
    const fileName = `${userId}-${timestamp}-${recordingId.slice(0, 12)}.mp3`;
    const storagePath = `audio-files/${fileName}`;

    // START PARALLEL PROCESSING
    response.status = 'parallel_start';
    response.message = 'Processing AI analysis and saving file simultaneously...';
    res.write(`data: ${JSON.stringify(response)}\n\n`);

    // Process A: Gemini API processing
    const geminiPromise = processWithGemini(base64Audio);
    
    // Process B: Upload to Supabase and save to database
    const uploadPromise = uploadAndSaveRecord(audioBuffer, storagePath, recordingId, userId, fileName);

    // Wait for both processes to complete
    const [geminiResult, uploadResult] = await Promise.all([
      geminiPromise.catch(error => ({ error: `Gemini processing failed: ${error.message}` })),
      uploadPromise.catch(error => ({ error: `Upload failed: ${error.message}` }))
    ]);

    // Check for errors in either process
    if (geminiResult.error) {
      response.status = 'error';
      response.message = geminiResult.error;
      res.write(`data: ${JSON.stringify(response)}\n\n`);
      res.end();
      return;
    }

    if (uploadResult.error) {
      response.status = 'error';
      response.message = uploadResult.error;
      res.write(`data: ${JSON.stringify(response)}\n\n`);
      res.end();
      return;
    }
    console.log('Gemini Result:', geminiResult);
    console.log('Upload Result:', uploadResult);

    response.status = 'finalizing';
    response.message = 'Finalizing results...';
    res.write(`data: ${JSON.stringify(response)}\n\n`);

    // Send final complete result
    response.status = 'complete';
    response.message = 'Processing complete!';
    response.data = {
      recording_id: recordingId,
      transcript: geminiResult.transcript,
      soapNote: geminiResult.soapNote,
      billingSuggestion: geminiResult.billingSuggestion,
      audio_file_path: storagePath
    };
    res.write(`data: ${JSON.stringify(response)}\n\n`);
    res.end();

    // Clean up temporary file
    fs.unlinkSync(audioFile.filepath);

  } catch (error) {
    console.error('Processing error:', error);
    response.status = 'error';
    response.message = `Processing failed: ${error.message}`;
    res.write(`data: ${JSON.stringify(response)}\n\n`);
    res.end();
  }
}

// Process A: Handle Gemini API request
async function processWithGemini(base64Audio) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error('Gemini API key not configured');
  }

  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: "Create transcription, SOAP note and billing suggestion"
          },
          {
            inline_data: {
              mime_type: "audio/mp3",
              data: base64Audio
            }
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          transcript: {
            type: SchemaType.STRING,
            description: "Complete transcription of the audio recording"
          },
          soapNote: {
            type: SchemaType.OBJECT,
            properties: {
              subjective: {
                type: SchemaType.STRING,
                description: "Subjective findings - what the patient reports (symptoms, concerns, history)"
              },
              objective: {
                type: SchemaType.STRING,
                description: "Objective clinical observations - measurable/observable findings (vitals, physical exam, lab results)"
              },
              assessment: {
                type: SchemaType.STRING,
                description: "Clinical assessment and diagnosis based on subjective and objective findings"
              },
              plan: {
                type: SchemaType.STRING,
                description: "Treatment plan, medications, follow-up instructions and next steps"
              }
            },
            required: ["subjective", "objective", "assessment", "plan"]
          },
          billingSuggestion: {
            type: SchemaType.STRING,
            description: "Appropriate billing codes (CPT, ICD-10) and billing suggestions for the encounter"
          }
        },
        required: ["transcript", "soapNote", "billingSuggestion"]
      }
    }
  };

  const response = await fetch(`${url}?key=${geminiApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${errorText}`);
  }

  const geminiData = await response.json();

  if (!geminiData.candidates || !geminiData.candidates[0] || !geminiData.candidates[0].content) {
    throw new Error('Invalid response from Gemini API');
  }

  const responseText = geminiData.candidates[0].content.parts[0].text;
  return JSON.parse(responseText);
}

// Process B: Upload to Supabase Storage and save record to database
async function uploadAndSaveRecord(audioBuffer, storagePath, recordingId, userId, fileName) {
  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('audio-files')
    .upload(fileName, audioBuffer, {
      contentType: 'audio/mp3',
      upsert: false
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  // Save record to database
  const { data: recordData, error: dbError } = await supabase
    .from(recordingTableName)
    .insert({
      id: recordingId,
      user_id: userId,
      audio_file_path: storagePath,
      file_name: fileName,
      file_size: audioBuffer.length,
      status: 'processing',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (dbError) {
    // If database insert fails, try to clean up the uploaded file
    await supabase.storage
      .from('audio-files')
      .remove([fileName])
      .catch(console.error);
    
    throw new Error(`Database save failed: ${dbError.message}`);
  }

  return { uploadData, recordData };
}