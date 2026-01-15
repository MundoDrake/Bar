// src/services/teamService.ts

import { supabase } from '../lib/supabase';

/** Generate a unique custom ID for a user (8-character alphanumeric + timestamp suffix) */
export const generateCustomId = (): string => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randomPart = Array.from({ length: 6 }, () => charset[Math.floor(Math.random() * charset.length)]).join('');
    // Add last 2 chars from timestamp to ensure uniqueness
    const timePart = Date.now().toString(36).slice(-2).toUpperCase();
    return randomPart + timePart;
};

/** Create a new team and add the owner as a member */
export const createTeam = async (ownerUserId: string, name: string) => {
    const { data, error } = await supabase
        .from('teams')
        .insert({ name, owner_user_id: ownerUserId })
        .select()
        .single();
    if (error) throw error;
    if (!data) throw new Error('Failed to create team');
    // Insert owner membership
    await supabase.from('team_members').insert({ team_id: data.id, user_id: ownerUserId, role: 'owner' });
    return data;
};

/** Invite/add a member to an existing team by their user ID (from user_profiles lookup) */
export const addMemberToTeam = async (teamId: string, memberUserId: string) => {
    const { error } = await supabase
        .from('team_members')
        .insert({ team_id: teamId, user_id: memberUserId, role: 'member' });
    if (error) throw error;
};

/** Find a user by their custom_id and return their auth user_id */
export const findUserByCustomId = async (customId: string): Promise<string | null> => {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('custom_id', customId)
        .maybeSingle();

    if (error || !data) {
        console.error('Error finding user by custom_id:', error);
        return null;
    }
    return data.user_id;
};

/** Retrieve or create a user profile (custom ID) for the authenticated Supabase user */
export const getOrCreateUserProfile = async (supabaseUserId: string): Promise<string | null> => {
    try {
        console.log('[teamService] Getting or creating profile for user:', supabaseUserId);

        // Try to fetch existing profile
        const { data, error } = await supabase
            .from('user_profiles')
            .select('custom_id')
            .eq('user_id', supabaseUserId)
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('[teamService] Error fetching user profile:', error);
            // Don't return null immediately on error, try to create if it's not a permission error? 
            // Better to fail safe.
            return null;
        }

        if (data && data.custom_id) {
            console.log('[teamService] Found existing profile:', data.custom_id);
            return data.custom_id as string;
        }

        // No profile – create one
        console.log('[teamService] Creating new profile for user:', supabaseUserId);
        const customId = generateCustomId();
        const { error: insertErr } = await supabase
            .from('user_profiles')
            .insert({ user_id: supabaseUserId, custom_id: customId });

        if (insertErr) {
            console.error('[teamService] Error creating user profile:', insertErr);
            return null;
        }

        console.log('[teamService] Created profile with custom_id:', customId);
        return customId;
    } catch (e) {
        console.error('[teamService] Unexpected error in getOrCreateUserProfile:', e);
        return null;
    }
};

/** Find a team by its owner's custom ID */
/** Find a team by its owner's custom ID using secure RPC (bypassing RLS for public info) */
export const findTeamByOwnerCustomId = async (ownerCustomId: string): Promise<{ teamId: string; teamName: string } | null> => {
    try {
        console.log('[teamService] Looking up team for owner custom code:', ownerCustomId);

        // Use the Secure RPC function to find the team without RLS issues
        const { data, error } = await supabase
            .rpc('get_team_public_info', { owner_custom_id: ownerCustomId });

        if (error) {
            console.error('[teamService] RPC Error finding team:', error);
            return null;
        }

        // RPC returns a list (table), usually 0 or 1 row
        if (!data || data.length === 0) {
            console.log('[teamService] No team found for this code.');
            return null;
        }

        const team = data[0]; // Take first result
        return { teamId: team.team_id, teamName: team.team_name };
    } catch (e) {
        console.error('[teamService] Unexpected error in findTeamByOwnerCustomId:', e);
        return null;
    }
};

/** Join a team by the owner's custom ID (add current user as member) */
export const joinTeamByOwnerCustomId = async (ownerCustomId: string, currentUserId: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const teamInfo = await findTeamByOwnerCustomId(ownerCustomId);
        if (!teamInfo) {
            return { success: false, error: 'Time não encontrado. Verifique o ID informado.' };
        }

        // Check if user is already a member
        const { data: existingMember } = await supabase
            .from('team_members')
            .select('id')
            .eq('team_id', teamInfo.teamId)
            .eq('user_id', currentUserId)
            .maybeSingle();

        if (existingMember) {
            return { success: false, error: 'Você já é membro deste time.' };
        }

        // Add current user as member of the team
        await addMemberToTeam(teamInfo.teamId, currentUserId);

        return { success: true };
    } catch (e: any) {
        console.error('[teamService] Error joining team:', e);
        if (e.code === '23505') {
            return { success: false, error: 'Você já é membro deste time.' };
        }
        return { success: false, error: 'Erro ao entrar no time.' };
    }
};
