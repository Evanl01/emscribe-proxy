import { getSupabaseClient } from '@/src/utils/supabase';
import { authenticateRequest } from '@/src/utils/authenticateRequest';
import { recordingSchema, transcriptSchema, soapNoteSchema } from '@/src/app/schemas';
import formidable from 'formidable';
import fs from 'fs';
import th from 'zod/v4/locales/th.cjs';
import { record } from 'zod';

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    const supabase = getSupabaseClient(req.headers.authorization);
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
            const { data: recording, error: recError } = await supabase
                .from('recordings')
                .select('*')
                .eq('id', recording_id)
                .single();

            if (recError) {
                console.error('Recording query error:', recError);
                return res.status(500).json({ error: 'Database error: ' + recError.message });
            }


            // Step 2: Fetch transcript
            console.log('Step 2: Fetching transcript for recording_id:', recording.id);
            const { data: transcript, error: transError, count: transCount } = await supabase
                .from('transcripts')
                .select('*')
                .eq('recording_id', recording.id)
                .single();
            if (transError) {
                console.error('Transcript query error:', transError);
                return res.status(500).json({ error: 'Database error: ' + transError.message });
            }

            
             // Use first transcript

            // Step 3: Fetch SOAP notes
            console.log('Step 3: Fetching SOAP notes for transcript_id:', transcript.id);
            const { data: soapNotes, error: soapError, count: soapCount } = await supabase
                .from('soapNotes')
                .select('*')
                .eq('transcript_id', transcript.id);
            if (soapError) {
                console.error('SOAP notes query error:', soapError);
                return res.status(500).json({ error: 'Database error: ' + soapError.message });
            }


            // Step 4: Generate signed URL for audio file
            console.log('Step 4: Generating signed URL for audio file');
            let audio_url = null;
            if (recording.audio_file_path) {
                let filePath = recording.audio_file_path;
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
                recording,
                transcript,
                soapNotes,
                audio_url
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






    // POST /api/patient-encounters/complete----------------------------------------------------------------------------------------------
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
        let audio_file_path = fields.audio_file_path.replace(/^audio-files\//, '');
        const transcript_text = fields.transcript_text;
        let soapNote_texts = fields.soapNote_text;
        if (!Array.isArray(soapNote_texts)) soapNote_texts = [soapNote_texts];

        if (!name || !transcript_text || !audio_file_path || !soapNote_texts[0]) {
            console.error('API error: Missing required fields', { name, transcript_text, audio_file_path, soapNote_texts });
            return res.status(400).json({ error: 'Required fields: name, audio_file_path, transcript_text, soapNote_text' });
        }

        let soapNotesRes = [];
        let recordingRes, transcriptRes;
        // 1. Confirm audio file exists
        try {

            const folder = audio_file_path.split('/')[0];
            const filename = audio_file_path.split('/')[1];
            const { data: fileData, error: fileError } = await supabase.storage
                .from('audio-files')
                .list(folder);
            if (fileError || !fileData || !fileData.find(f => f.name === filename)) {
                console.error('API error: Audio file not found in Supabase Storage', { audio_file_path, fileError });
                throw new Error('audio_file_path does not exist: ' + audio_file_path);
            }


            // Create recording row
            // console.log('Creating recording row with data:', { name, audio_file_path: uploadData.fullPath, user_id: user.id });
            const recordingSchemaResult = recordingSchema.safeParse({ name, audio_file_path, user_id: user.id });
            if (!recordingSchemaResult.success) {
                console.error('API error: Recording schema validation failed', recordingSchemaResult.error);
                throw new Error('Recording schema validation failed: ' + recordingSchemaResult.error.message);
            }

            let recording = recordingSchemaResult.data;
            const recRes = await supabase
                .from('recordings')
                .insert([recording])
                .select()
                .single();
            if (recRes.error) {
                console.error('API error: Recording save failed', recRes.error);
                throw new Error('Recording save failed: ' + recRes.error.message);
            }
            recordingRes = recRes.data;
            console.log('Recording saved:', recordingRes);

            // Create transcript row
            console.log('Creating transcript row with data:', { transcript_text, recording_id: recordingRes.id, user_id: user.id });
            const transcriptSchemaResult = transcriptSchema.safeParse({ transcript_text, recording_id: recordingRes.id, user_id: user.id });
            if (!transcriptSchemaResult.success) {
                console.error('API error: Transcript schema validation failed', transcriptSchemaResult.error);
                throw new Error('Transcript schema validation failed: ' + transcriptSchemaResult.error.message);
            }
            
            const transRes = await supabase
                .from('transcripts')
                .insert([transcriptSchemaResult.data])
                .select()
                .single();
            if (transRes.error) throw new Error('Transcript save failed: ' + transRes.error.message);
            if (transRes.error) {
                console.error('API error: Transcript save failed', transRes.error);
                throw new Error('Transcript save failed: ' + transRes.error.message);
            }
            transcriptRes = transRes.data;
            console.log('Transcript saved:', transcriptRes);

            // Create soapNotes (can be multiple)
            for (const soapNote_text of soapNote_texts) {
                if (!soapNote_text) continue;
                //expecting soapNote_text to be a jsonb object
                let soapNote_textObject = soapNote_text.trim();
                if (typeof soapNote_textObject === "string") {
                    try {
                        soapNote_textObject = JSON.parse(soapNote_textObject);
                    } catch (e) {
                        console.error('API error: SOAP note is not valid JSON', e);
                        throw new Error('SOAP note is not valid JSON');
                    }
                }

                const orderedSoapNote = {
                    subjective: soapNote_textObject?.soapNote?.subjective || "",
                    objective: soapNote_textObject?.soapNote?.objective || "",
                    assessment: soapNote_textObject?.soapNote?.assessment || "",
                    plan: soapNote_textObject?.soapNote?.plan || "",
                };
                const orderedBillingSuggestion = {
                    icd10: soapNote_textObject?.billingSuggestion?.icd10 || "",
                    cpt: soapNote_textObject?.billingSuggestion?.cpt || "",
                    additional_inquiries: soapNote_textObject?.billingSuggestion?.additional_inquiries || "",
                }

                const orderedSoapNoteTextObject = {
                    soapNote: orderedSoapNote,
                    billingSuggestion: soapNote_textObject?.billingSuggestion || {},
                };
                console.log('Parsed, ordered SOAP note text:', orderedSoapNoteTextObject);
                const soapNoteSchemaResult = soapNoteSchema.safeParse({ soapNote_text: orderedSoapNoteTextObject, transcript_id: transcriptRes.id, user_id: user.id });
                if (!soapNoteSchemaResult.success) {
                    console.error('API error: SOAP note schema validation failed', soapNoteSchemaResult.error);
                    throw new Error('SOAP note schema validation failed: ' + soapNoteSchemaResult.error.message);
                }
                let soapNote = soapNoteSchemaResult.data;
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
                
                soapNotesRes.push(soapRes.data);
            }


            return res.status(201).json({
                recordingRes,
                transcriptRes,
                soapNotesRes
            });
        } catch (err) {
            // Rollback all previous steps. Start from soapNotes, which FK references transcript, which FK references recording
            if (soapNotesRes && soapNotesRes.length > 0 && transcriptRes && transcriptRes.id) {
                await supabase.from('soapNotes').delete().eq('transcript_id', transcriptRes.id);
            }
            if (transcriptRes && transcriptRes.id) {
                await supabase.from('transcripts').delete().eq('id', transcriptRes.id);
            }
            if (recordingRes && recordingRes.id) {
                await supabase.from('recordings').delete().eq('id', recordingRes.id);
            }
            // Skip file deletion, let users retry saving in frontend.
            // if( audio_file_path){
            //     audio_file_path = audio_file_path.replace(/^audio-files\//, '');
            //     await supabase.storage.from('audio-files').remove([audio_file_path]);
            // }
            console.error('API error:', err);
            if (err.stack) {
                console.error('Stack trace:', err.stack);
            }
            if(err.message.includes('unique')){
                err.message = 'Recording with this name already exists. Please choose a different name.';
            }
            return res.status(500).json({ error: err.message });
        }
    }
    return res.status(405).json({ error: 'Method not allowed' });
}
