import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with Service Role Key for Admin access
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

export default async function handler(request: VercelRequest, response: VercelResponse) {
    // Only allow POST
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { owner_custom_id, user_id } = request.body;

    if (!owner_custom_id || !user_id) {
        return response.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // 1. Find the owner user by their custom_id
        const { data: ownerProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('user_id')
            .eq('custom_id', owner_custom_id.toUpperCase())
            .single();

        if (profileError || !ownerProfile) {
            return response.status(404).json({ error: 'Usuário não encontrado com este ID.' });
        }

        const ownerUserId = ownerProfile.user_id;

        // Prevent joining own team
        if (ownerUserId === user_id) {
            return response.status(400).json({ error: 'Você não pode entrar no seu próprio time.' });
        }

        // 2. Find the team owned by this user
        const { data: team, error: teamError } = await supabase
            .from('teams')
            .select('id, name')
            .eq('owner_user_id', ownerUserId)
            .single();

        if (teamError || !team) {
            return response.status(404).json({ error: 'Este usuário não possui um time.' });
        }

        // 3. Check if already a member
        const { data: existingMember } = await supabase
            .from('team_members')
            .select('id')
            .eq('team_id', team.id)
            .eq('user_id', user_id)
            .single();

        if (existingMember) {
            return response.status(409).json({ error: 'Você já é membro deste time.' });
        }

        // 4. Add user as member
        const { error: insertError } = await supabase
            .from('team_members')
            .insert({
                team_id: team.id,
                user_id: user_id,
                role: 'member'
            });

        if (insertError) {
            console.error('Error adding team member:', insertError);
            return response.status(500).json({ error: 'Erro ao entrar no time.' });
        }

        return response.status(200).json({
            success: true,
            team_name: team.name
        });

    } catch (error: any) {
        console.error('Unexpected error:', error);
        return response.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
