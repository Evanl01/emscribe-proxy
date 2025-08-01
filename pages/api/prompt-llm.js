// Backend: /api/process-recording.js

import { getSupabaseClient } from '@/src/utils/supabase';
import { authenticateRequest } from '@/src/utils/authenticateRequest';
import { recordingSchema } from '@/src/app/schemas';
import formidable from 'formidable';
import fs from 'fs';
import { getTranscriptReqBody, getSoapNoteAndBillingRequestBody } from '@/src/utils/geminiRequestBodies'; // Adjust the import path as needed

const recordingTableName = 'recordings';

// Schema types for Gemini structured output

let response = {
    status: '',      // e.g. 'started', 'processing', 'error', etc.
    message: '',     // e.g. 'Processing started...', etc.
};

// Disable Next.js body parsing to handle multipart/form-data
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    // Authenticate user for all methods
    const supabase = getSupabaseClient(req.headers.authorization);
    const { user, error: authError } = await authenticateRequest(req);
    if (authError) return res.status(401).json({ error: authError });

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    // Start timer
    const startTime = Date.now();
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

        // Expect JSON body with audio_file_path
        let body = '';
        req.on('data', chunk => { body += chunk; });
        await new Promise(resolve => req.on('end', resolve));
        let audioFilePath;
        try {
            const parsed = JSON.parse(body);
            audioFilePath = parsed.audio_file_path;
        } catch (e) {
            response.status = 'error';
            response.message = 'Invalid JSON body or missing audio_file_path';
            res.write(`data: ${JSON.stringify(response)}\n\n`);
            res.end();
            return;
        }
        if (!audioFilePath) {
            response.status = 'error';
            response.message = 'audio_file_path is required';
            res.write(`data: ${JSON.stringify(response)}\n\n`);
            res.end();
            return;
        }

        response.status = 'downloading';
        response.message = 'Downloading audio file from Supabase Storage...';
        res.write(`data: ${JSON.stringify(response)}\n\n`);

        // Download file from Supabase Storage
        const { data: downloadData, error: downloadError } = await supabase.storage
            .from('audio-files')
            .download(audioFilePath);
        if (downloadError || !downloadData) {
            response.status = 'error';
            response.message = `Failed to download audio file: ${downloadError?.message || 'Unknown error'}`;
            res.write(`data: ${JSON.stringify(response)}\n\n`);
            res.end();
            return;
        }
        // Convert to buffer
        const audioBuffer = Buffer.from(await downloadData.arrayBuffer());
        const base64Audio = audioBuffer.toString('base64');
        const transcriptReqBody = getTranscriptReqBody(base64Audio);

        // TRANSCRIBING RECORDING WITH GEMINI
        response.status = 'transcribing';
        response.message = 'Transcribing audio...';
        res.write(`data: ${JSON.stringify(response)}\n\n`);

        // Transcribe audio using Gemini API
        const transcriptResult = await geminiAPIReq(transcriptReqBody).catch(error => {
            response.status = 'error';
            response.message = `Transcription failed: ${error.message}`;
            res.write(`data: ${JSON.stringify(response)}\n\n`);
            res.end();
            return;
        });

        response.status = 'transcription complete';
        response.message = 'Transcription complete!';
        // Send message, with additional 'data' field for transcript
        res.write(`data: ${JSON.stringify({ ...response, data: { transcript: transcriptResult.transcript } })}\n\n`);

        // Create SOAP Note and Billing Suggestion request body
        response.status = 'creating soap note';
        response.message = 'Creating SOAP note and billing suggestion...';
        res.write(`data: ${JSON.stringify(response)}\n\n`);

        // Create SOAP Note and Billing Suggestion using Gemini API
        const soapNoteAndBillingReqBody = getSoapNoteAndBillingRequestBody(transcriptResult.transcript);
        const soapNoteAndBillingResult = await geminiAPIReq(soapNoteAndBillingReqBody).catch(error => {
            response.status = 'error';
            response.message = `SOAP Note processing failed: ${error.message}`;
            res.write(`data: ${JSON.stringify(response)}\n\n`);
            res.end();
            return;
        });

        response.status = 'soap note complete';
        response.message = 'SOAP note and billing suggestion created successfully!';
        res.write(`data: ${JSON.stringify({ ...response, data: soapNoteAndBillingResult })}\n\n`);
        res.end();

    } catch (error) {
        console.error('Processing error:', error);
        response.status = 'error';
        response.message = `Processing failed: ${error.message}`;
        res.write(`data: ${JSON.stringify(response)}\n\n`);
        res.end();
    }
}

//  Handle Gemini API request
async function geminiAPIReq(reqBody) {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const geminiApiUrl = process.env.GEMINI_API_URL || "https://generative-language.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    if (!geminiApiKey) {
        throw new Error('Gemini API key not configured');
    }

    const response = await fetch(`${geminiApiUrl}?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(reqBody)
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


// // Process B: Upload to Supabase Storage and save record to database
// async function uploadAndSaveRecord(audioBuffer, storagePath, userId, fileName) {
//     //

//     // Upload to Supabase Storage
//     const { data: uploadData, error: uploadError } = await supabase.storage
//         .from('audio-files')
//         .upload(fileName, audioBuffer, {
//             contentType: 'audio/mp3',
//             upsert: false
//         });

//     if (uploadError) {
//         throw new Error(`Storage upload failed: ${uploadError.message}`);
//     }
//     //create recording object using recordingSchema
//     const parseResult = recordingSchema.safeParse({ audio_file_path: uploadData.fullPath, name: fileName, user_id: userId });
//     if (!parseResult.success) {
//         throw new Error(`Schema validation failed: ${parseResult.error.errors.map(e => e.message).join(', ')}`);
//     }
//     const recording = parseResult.data;
//     // Save record to database

//     const { data: recordData, error: dbError } = await supabase
//         .from(recordingTableName)
//         .insert([recording])
//         .select()
//         .single();

//     console.log('Record Data:', recordData);
//     if (dbError) {
//         // No need to delete the file here, as the upload will be cleaned up in the ACID main handler
//         // await supabase.storage
//         //     .from('audio-files')
//         //     .remove([fileName])
//         //     .catch(console.error);

//         throw new Error(`Database save failed: ${dbError.message}`);
//     }

//     return { uploadData, recordData };
// }