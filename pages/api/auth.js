import { getSupabaseClient } from '@/src/utils/supabase';
import { authenticateRequest } from '@/src/utils/authenticateRequest';

export default async function handler(req, res) {
    const supabase = getSupabaseClient(req.headers.authorization);
    if (req.method === 'POST') {
        const { action, email, password, emailRedirectTo } = req.body;

        if (!action) {
            return res.status(400).json({ error: 'Action is required (sign-up, sign-in, sign-out, resend)' });
        }

        if ((action === 'sign-up' || action === 'sign-in') && (!email || !password)) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if ((action === 'sign-up' || action === 'sign-in') && !email.includes('@')) {
            return res.status(400).json({ error: 'Invalid email format: ' + email });
        }

        if (action === 'sign-up') {
            // JWT validity check endpoint

            const { data, error } = await supabase.auth.signUp({ email, password });
            if (error) return res.status(500).json({ error: error.message });

            console.log("Sign-up data:", data);
            return res.status(201).json({ token: data.session.access_token });
        }

        if (action === 'check-validity') {
            const { user, error: verifyError } = await authenticateRequest(req);
            if (verifyError) return res.status(401).json({ error: verifyError });
            // Optionally return user info or just success
            return res.status(200).json({ valid: true, user });
        }

        if (action === 'sign-in') {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) return res.status(401).json({ error: error.message });
            return res.status(200).json({ token: data?.session?.access_token || null });
        }

        if (action === 'sign-out') {// Only need req.body.action
            const { user, error: verifyError } = await authenticateRequest(req);
            if (verifyError) return res.status(401).json({ error: verifyError });
            const { error } = await supabase.auth.signOut();
            if (error) return res.status(500).json({ error: error.message });
            return res.status(200).json({ success: true });
        }

        if (action === 'resend') {
            if (!email) return res.status(400).json({ error: 'Email is required to resend confirmation email' });
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email,
                options: emailRedirectTo ? { emailRedirectTo } : undefined
            });
            if (error) return res.status(500).json({ error: error.message });
            return res.status(200).json({ success: true });
        }

        return res.status(400).json({ error: 'Invalid action' });
    }

    res.status(405).json({ error: 'Method not allowed' });
}