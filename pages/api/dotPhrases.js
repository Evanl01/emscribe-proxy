import { getSupabaseClient } from '@/src/utils/supabase';
import { authenticateRequest } from '@/src/utils/authenticateRequest';
import { dotPhraseSchema } from '@/src/app/schemas';
import { z } from 'zod';

const dotPhrasesTable = 'dotPhrases';

export default async function handler(req, res) {
    const supabase = getSupabaseClient(req.headers.authorization);
    // Authenticate user for all methods
    const { user, error: authError } = await authenticateRequest(req);
    if (authError) return res.status(401).json({ error: authError });

    // GET ---------------------------------------------------------
    if (req.method === 'GET') {
        const id = req.query.id;

        if (id) {
            // Get a single dot phrase by ID
            const { data, error } = await supabase
                .from(dotPhrasesTable)
                .select('*')
                .eq('id', id)
                .eq('user_id', user.id)
                .single();

            if (error) return res.status(500).json({ error: error.message });

            if (!data) {
                return res.status(404).json({ error: 'Dot phrase not found' });
            }

            return res.status(200).json(data);
        } else {
            // Get all dot phrases for the user
            const { data, error } = await supabase
                .from(dotPhrasesTable)
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) return res.status(500).json({ error: error.message });

            return res.status(200).json(data || []);
        }
    }

    // POST -------------------------------------------------------
    if (req.method === 'POST') {
        const { trigger, expansion } = req.body;

        if (!trigger || !expansion) {
            return res.status(400).json({ error: 'trigger and expansion are required' });
        }

        const dotPhrase = {
            trigger,
            expansion,
            user_id: user.id
        };

        const { data: insertData, error: insertError } = await supabase
            .from(dotPhrasesTable)
            .insert([dotPhrase])
            .select()
            .single();

        if (insertError) return res.status(500).json({ error: insertError.message });

        return res.status(201).json(insertData);
    }

    // PATCH -----------------------------------------------------------------------------------------
    if (req.method === 'PATCH') {
        const parseResult = dotPhraseSchema.partial().safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error });
        }
        const dotPhrase = parseResult.data;
        // console.log('Creating dotPhrase:', dotPhrase);
        dotPhrase.user_id = user.id; // Ensure user_id is set to the authenticated user's ID
        if (!dotPhrase.id) {
            return res.status(400).json({ error: 'id is required for update' });
        }

        

        const { data: updatedData, error: updateError } = await supabase
            .from(dotPhrasesTable)
            .update(dotPhrase)
            .eq('id', dotPhrase.id)
            .select()
            .single();

        if (updateError) return res.status(500).json({ error: updateError.message });

        if (!updatedData) {
            return res.status(404).json({ error: 'Dot phrase not found or not authorized to update' });
        }

        return res.status(200).json(updatedData);
    }

    // DELETE ------------------------------------------------------------------------
    if (req.method === 'DELETE') {
        const id = req.query.id;
        if (!id) return res.status(400).json({ error: 'Dot phrase ID is required' });

        const { data, error } = await supabase
            .from(dotPhrasesTable)
            .delete()
            .eq('id', id)
            .eq('user_id', user.id) // Ensure only the owner can delete
            .select()
            .single();

        if (error) return res.status(500).json({ error: error.message });

        if (!data) {
            return res.status(404).json({ error: 'Dot phrase not found or not authorized to delete' });
        }

        return res.status(200).json({ success: true, data });
    }

    res.status(405).json({ error: 'Method not allowed' });
}
