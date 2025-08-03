import { getSupabaseClient } from '@/src/utils/supabase';
import { authenticateRequest } from '@/src/utils/authenticateRequest';
import { recordingSchema, transcriptSchema, soapNoteSchema, patientEncounterSchema } from '@/src/app/schemas';
import formidable from 'formidable';
import fs from 'fs';
import th from 'zod/v4/locales/th.cjs';
import { json, record } from 'zod';

const patientEncounterTable = 'patientEncounters';
const soapNoteTable = 'soapNotes';

export default async function handler(req, res) {
    const supabase = getSupabaseClient(req.headers.authorization);
    const { user, error: authError } = await authenticateRequest(req);
    if (authError) return res.status(401).json({ error: authError });

    if (req.method == 'GET') {
        console.log(patientEncounterTable, user.id);
        const { data, error, count } = await supabase
            .from(patientEncounterTable)
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        if (error) return res.status(500).json({ error: error.message });
        console.log('Patient Encounters:', data);

        if (!data || data.length === 0) {
            return res.status(200).json({ patientEncounters: [] });
        }
        for (const patientEncounter of data) {
            const { data: soapNotes, error: soapNoteError } = await supabase
                .from(soapNoteTable)
                .select('*')
                .eq('patientEncounter_id', patientEncounter.id)
                .order('created_at', { ascending: false });
            if (soapNoteError) return res.status(500).json({ error: soapNoteError.message });
            patientEncounter.soapNotes = soapNotes;
        }

        return res.status(200).json({ patientEncounters: data, count });
    }



    // POST /api/patient-encounters/complete----------------------------------------------------------------------------------------------
    else if (req.method == 'POST') {
        const patientEncounterParseResult = patientEncounterSchema.safeParse(req.body.patientEncounter);
        if (!patientEncounterParseResult.success) {
            console.error('Patient Encounter validation error:', patientEncounterParseResult.error);
            return res.status(400).json({ error: patientEncounterParseResult.error });
        }
        const patientEncounter = patientEncounterParseResult.data;
        patientEncounter.user_id = user.id; // Ensure user_id is set to the authenticated user's ID
        let soapNoteData = null, soapNoteError = null, patientEncounterData = null, patientEncounterError = null;
        try {
            console.log('Creating Patient Encounter:', patientEncounter);
            ({ data: patientEncounterData, error: patientEncounterError } = await supabase
                .from(patientEncounterTable)
                .insert([patientEncounter])
                .select()
                .single());
            if (patientEncounterError) throw new Error('Failed to create Patient Encounter: ' + patientEncounterError.message);
            // console.log('Patient Encounter created:', patientEncounterData);

            let soapNote_textObject = req.body.soapNote_text.trim();
            console.log('SOAP Note text:', soapNote_textObject);
            try {
                soapNote_textObject = JSON.parse(soapNote_textObject);
            }
            catch (e) {
                throw new Error('Invalid JSON format for soapNote_text');
            }
            const soapNoteObject = {
                soapNote_text: soapNote_textObject,
                patientEncounter_id: patientEncounterData.id, // Link SOAP Note to Patient Encounter
            };
            console.log('Parsed SOAP Note:', soapNoteObject);
            const soapNoteParseResult = soapNoteSchema.safeParse(soapNoteObject);
            if (!soapNoteParseResult.success) {
                // console.error('SOAP Note validation error:', soapNoteParseResult.error);
                throw new Error('Invalid SOAP Note format');
            }
            const soapNote = soapNoteParseResult.data;
            soapNote.user_id = user.id;

            ({ soapNoteData, soapNoteError } = await supabase
                .from(soapNoteTable)
                .insert([soapNote])
                .select()
                .single());
            if (soapNoteError) throw new Error('Failed to create SOAP Note: ' + soapNoteError.message);
            return res.status(200).json({
                patientEncounter: patientEncounterData,
                soapNote: soapNoteData
            });

        }
        catch (err) {
            // Rollback all previous steps. Start from soapNotes, which FK references transcript, which FK references recording
            if (soapNoteData && soapNoteData.id) {
                await supabase.from('soapNotes').delete().eq('id', soapNoteData.id);
            }
            if (patientEncounterData && patientEncounterData.id) {
                await supabase.from('patientEncounters').delete().eq('id', patientEncounterData.id);
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
            if (err.message.includes('unique')) {
                err.message = 'Patient Encounter with this name already exists. Please use a different name.';
            }
            return res.status(500).json({ error: err.message });
        }
    }
    return res.status(405).json({ error: 'Method not allowed' });
}
