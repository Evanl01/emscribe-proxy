import supabase from '@/src/utils/supabase';
import { authenticateRequest } from '@/src/utils/authenticateRequest';
import { recordingSchema, transcriptSchema, soapNoteSchema } from '@/src/app/schemas';
import formidable from 'formidable';
import fs from 'fs';
import th from 'zod/v4/locales/th.cjs';

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    const { user, error: authError } = await authenticateRequest(req);
    if (authError) return res.status(401).json({ error: authError });

    if (req.method == 'GET') {
        try {
            // console.log('=== GET Request Processing ===');
            // console.log('Fetching patient encounter for recording_id:', req.query.recording_id);

            const recording_id = parseInt(req.query.recording_id);
            // console.log('Parsed recording_id:', recording_id, 'Type:', typeof recording_id);

            if (!recording_id || isNaN(recording_id)) {
                console.error('Invalid recording ID:', req.query.recording_id);
                return res.status(400).json({ error: 'Valid Recording ID is required' });
            }

            // Step 1: Fetch recording
            console.log('Step 1: Fetching recording with id:', recording_id, 'user_id:', user.id);
            const { data: recording, error: recError, count: recCount } = await supabase
                .from('recordings')
                .select('*')
                .eq('id', recording_id)
                .eq('user_id', user.id);

            if (recError) {
                console.error('Recording query error:', recError);
                return res.status(500).json({ error: 'Database error: ' + recError.message });
            }

            if (!recording || recording.length === 0) {
                console.error('No recording found for id:', recording_id, 'user_id:', user.id);
                return res.status(404).json({ error: 'Recording not found or access denied' });
            }

            if (recording.length > 1) {
                console.warn('Multiple recordings found (should not happen):', recording.length);
            }

            const recordingData = recording[0]; // Use first result

            // Step 2: Fetch transcript
            console.log('Step 2: Fetching transcript for recording_id:', recordingData.id);
            const { data: transcript, error: transError, count: transCount } = await supabase
                .from('transcripts')
                .select('*')
                .eq('recording_id', recordingData.id);
            if (transError) {
                console.error('Transcript query error:', transError);
                return res.status(500).json({ error: 'Database error: ' + transError.message });
            }

            if (!transcript || transcript.length === 0) {
                console.warn('No transcript found for recording_id:', recordingData.id);
                // Return recording without transcript
                const patient_encounter = {
                    id: recordingData.id,
                    name: recordingData.name,
                    created_at: recordingData.created_at,
                    audio_url: null,
                    transcript: null,
                };
                console.log('Returning encounter without transcript:', patient_encounter);
                return res.status(200).json(patient_encounter);
            }

            const transcriptData = transcript[0]; // Use first transcript

            // Step 3: Fetch SOAP notes
            console.log('Step 3: Fetching SOAP notes for transcript_id:', transcriptData.id);
            const { data: soapNotes, error: soapError, count: soapCount } = await supabase
                .from('soapNotes')
                .select('*')
                .eq('transcript_id', transcriptData.id);
            if (soapError) {
                console.error('SOAP notes query error:', soapError);
                return res.status(500).json({ error: 'Database error: ' + soapError.message });
            }

            const transcriptWithSoapNotes = {
                ...transcriptData,
                soapNotes: soapNotes || [],
            };
            
            // Step 4: Generate signed URL for audio file
            console.log('Step 4: Generating signed URL for audio file');
            let audio_url = null;
            if (recordingData.audio_file_path) {
                let filePath = recordingData.audio_file_path;
                // Remove 'audio-files/' prefix if present
                if (filePath.startsWith('audio-files/')) {
                    filePath = filePath.replace(/^audio-files\//, '');
                }
                console.log('Audio file path for signed URL:', filePath);
                const { data: signedData, error: signedError } = await supabase.storage
                    .from('audio-files')
                    .createSignedUrl(filePath, 60 * 60);
                if (signedError) {
                    console.error('Signed URL error:', signedError);
                    // Print more details for debugging
                    if (signedError.message) console.error('Signed URL error message:', signedError.message);
                    audio_url = null;
                } else {
                    audio_url = signedData?.signedUrl || null;
                    console.log('Generated audio URL:', audio_url ? 'Success' : 'Failed');
                }
            } else {
                console.log('No audio file path in recording');
            }

            // Step 5: Prepare final response
            const patient_encounter = {
                id: recordingData.id,
                name: recordingData.name,
                created_at: recordingData.created_at,
                audio_url,
                transcript: transcriptWithSoapNotes,
            };

            console.log('=== Final Response ===');
            console.log('Patient encounter prepared:', patient_encounter);

            return res.status(200).json(patient_encounter);

        } catch (err) {
            console.error('=== CATCH BLOCK ===');
            console.error('Caught error:', err);
            console.error('Error message:', err.message);
            console.error('Error stack:', err.stack);
            return res.status(500).json({ error: 'Internal server error: ' + err.message });
        }
    }
    // POST /api/patient-encounters/complete
    else if (req.method == 'POST') {

        // Parse multipart form data (for MP3 upload)
        const form = formidable({
            maxFileSize: 30 * 1024 * 1024, // 30MB
            keepExtensions: true,
            filter: ({ mimetype }) => mimetype && mimetype.includes('audio'),
        });

        let fields, files;
        try {
            [fields, files] = await form.parse(req);
        } catch (err) {
            console.error('API error: Invalid form data', err);
            if (err.stack) console.error('Stack trace:', err.stack);
            return res.status(400).json({ error: 'Invalid form data' });
        }
        // console.log('Parsed fields:', fields);
        // console.log('Parsed files:', files);
        // Required fields: name, transcript_text, chief_complaint, soapNote_text (can be array or string)

        for (const key in fields) {
            if (Array.isArray(fields[key]) && fields[key].length > 1) {
                return res.status(400).json({ error: `Field "${key}" has multiple values. Only one value is allowed.` });
            }
            // If it's an array with one value, flatten it
            if (Array.isArray(fields[key])) {
                fields[key] = fields[key][0];
            }
        }
        // for (const key in fields) {
        //     console.log(`Field ${key}:`, fields[key]);
        // }
        const name = fields.name;
        const transcript_text = fields.transcript_text;
        let soapNote_texts = fields.soapNote_text;
        if (!Array.isArray(soapNote_texts)) soapNote_texts = [soapNote_texts];
        const audioFile = Array.isArray(files.recording) ? files.recording[0] : files.recording;

        if (!name || !transcript_text || !audioFile || !soapNote_texts[0]) {
            console.error('API error: Missing required fields', { name, transcript_text, audioFile, soapNote_texts });
            return res.status(400).json({ error: 'Required fields: name, transcript_text, recording, soapNote_text' });
        }

        // 1. Upload audio file to Supabase Storage
        const audioBuffer = fs.readFileSync(audioFile.filepath);
        const fileName = `${user.email}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}.mp3`;
        const storagePath = `audio-files/${fileName}`;
        let uploadData, recording, transcript, soapNotes = [];
        try {
            // Upload audio
            const uploadRes = await supabase.storage
                .from('audio-files')
                .upload(fileName, audioBuffer, {
                    contentType: 'audio/mp3',
                    upsert: false
                });
            if (uploadRes.error) {
                console.error('API error: Audio upload failed', uploadRes.error);
                throw new Error('Audio upload failed: ' + uploadRes.error.message);
            }
            console.log('Audio uploaded to:', uploadRes.data?.fullPath);
            uploadData = uploadRes.data;


            // Create recording row
            // console.log('Creating recording row with data:', { name, audio_file_path: uploadData.fullPath, user_id: user.id });
            const recordingSchemaResult = recordingSchema.safeParse({ name, audio_file_path: uploadRes.data.fullPath, user_id: user.id });
            if (!recordingSchemaResult.success) {
                console.error('API error: Recording schema validation failed', recordingSchemaResult.error);
                throw new Error('Recording schema validation failed: ' + recordingSchemaResult.error.message);
            }
            
            recording = recordingSchemaResult.data;
            //Check if duplicate recording name exists
            const { data: existingRecording, error: nameCheckError } = await supabase
                .from('recordings')
                .select('id')
                .eq('user_id', user.id)
                .eq('name', recording.name)
                .maybeSingle();

            if (nameCheckError) {
                console.error('API error: Recording name check failed', nameCheckError);
                throw new Error('Recording name check failed: ' + nameCheckError.message);
            }

            const recRes = await supabase
                .from('recordings')
                .insert([recording])
                .select()
                .single();
            if (recRes.error) {
                console.error('API error: Recording save failed', recRes.error);
                throw new Error('Recording save failed: ' + recRes.error.message);
            }
            recording = recRes.data;
            console.log('Recording saved:', recording);

            // Create transcript row
            console.log('Creating transcript row with data:', { transcript_text, recording_id: recording.id, user_id: user.id });
            const transcriptSchemaResult = transcriptSchema.safeParse({ transcript_text, recording_id: recording.id, user_id: user.id });
            if (!transcriptSchemaResult.success) {
                console.error('API error: Transcript schema validation failed', transcriptSchemaResult.error);
                throw new Error('Transcript schema validation failed: ' + transcriptSchemaResult.error.message);
            }
            transcript = transcriptSchemaResult.data;
            const transRes = await supabase
                .from('transcripts')
                .insert([transcript])
                .select()
                .single();
            if (transRes.error) throw new Error('Transcript save failed: ' + transRes.error.message);
            if (transRes.error) {
                console.error('API error: Transcript save failed', transRes.error);
                throw new Error('Transcript save failed: ' + transRes.error.message);
            }
            transcript = transRes.data;
            console.log('Transcript saved:', transcript.id);

            // Create soapNotes (can be multiple)
            for (const soapNote_text of soapNote_texts) {
                if (!soapNote_text) continue;
                //expecting soapNote_text to be a jsonb object
                console.log('Creating SOAP note with text:', soapNote_text);
                let soapNote_textObject = soapNote_text.trim();
                if (typeof soapNote_textObject === "string") {
                    try {
                        soapNote_textObject = JSON.parse(soapNote_textObject);
                    } catch (e) {
                        console.error('API error: SOAP note is not valid JSON', e);
                        throw new Error('SOAP note is not valid JSON');
                    }
                }
                console.log('Parsed SOAP note text:', soapNote_textObject);
                const soapNoteSchemaResult = soapNoteSchema.safeParse({ soapNote_text: soapNote_textObject, transcript_id: transcript.id, user_id: user.id });
                if (!soapNoteSchemaResult.success) {
                    console.error('API error: SOAP note schema validation failed', soapNoteSchemaResult.error);
                    throw new Error('SOAP note schema validation failed: ' + soapNoteSchemaResult.error.message);
                }
                const soapNote = soapNoteSchemaResult.data;
                const soapRes = await supabase
                    .from('soapNotes')
                    .insert([soapNote])
                    .select()
                    .single();
                if (soapRes.error) throw new Error('SOAP note save failed: ' + soapRes.error.message);
                if (soapRes.error) {
                    console.error('API error: SOAP note save failed', soapRes.error);
                    throw new Error('SOAP note save failed: ' + soapRes.error.message);
                }
                soapNotes.push(soapRes.data);
            }

            // Clean up temp file
            fs.unlinkSync(audioFile.filepath);

            return res.status(201).json({
                recording,
                transcript,
                soapNotes
            });
        } catch (err) {
            // Rollback all previous steps. Start from soapNotes, which FK references transcript, which FK references recording
            if (soapNotes.length > 0 && transcript && transcript.id) {
                await supabase.from('soapNotes').delete().eq('transcript_id', transcript.id);
            }
            if (transcript && transcript.id) {
                await supabase.from('transcripts').delete().eq('id', transcript.id);
            }
            if (recording && recording.id) {
                await supabase.from('recordings').delete().eq('id', recording.id);
            }
            if (uploadData && uploadData.path) {
                await supabase.storage.from('audio-files').remove([uploadData.path]);
            }
            if (audioFile && audioFile.filepath && fs.existsSync(audioFile.filepath)) {
                try { fs.unlinkSync(audioFile.filepath); } catch (e) { }
            }
            console.error('API error:', err);
            if (err.stack) {
                console.error('Stack trace:', err.stack);
            }
            return res.status(500).json({ error: err.message });
        }
    }
    return res.status(405).json({ error: 'Method not allowed' });
}
