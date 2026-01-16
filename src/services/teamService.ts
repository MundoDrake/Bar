// src/services/teamService.ts
import { supabase } from '../lib/supabase';

/** Generate a unique custom ID for a user (8-character alphanumeric + timestamp suffix) */
export const generateCustomId = (): string => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randomPart = Array.from({ length: 6 }, () => charset[Math.floor(Math.random() * charset.length)]).join('');
    const timePart = Date.now().toString(36).slice(-2).toUpperCase();
    return randomPart + timePart;
};

/** Create a new team and add the owner as a member */
export const createTeam = async (ownerUserId: string, name: string) => {
    // Insert team
    const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({ name, owner_user_id: ownerUserId })
        .select()
        .single();

    if (teamError) {
        console.error('[teamService] Error creating team:', teamError);
        throw new Error(teamError.message);
    }

    // Add owner as team member
    const { error: memberError } = await supabase
        .from('team_members')
        .insert({
            team_id: team.id,
            user_id: ownerUserId,
            role: 'owner'
        });

    if (memberError) {
        console.error('[teamService] Error adding owner as member:', memberError);
        // Team was created, log error but continue
    }

    return team;
};

/** Invite/add a member to an existing team by their user ID */
export const addMemberToTeam = async (teamId: string, memberUserId: string) => {
    const { error } = await supabase
        .from('team_members')
        .insert({
            team_id: teamId,
            user_id: memberUserId,
            role: 'member'
        });

    if (error) {
        if (error.code === '23505') { // Unique constraint violation
            throw new Error('User is already a member of this team');
        }
        console.error('[teamService] Error adding member:', error);
        throw new Error(error.message);
    }

    return { success: true };
};

/** Find a user by their custom_id and return their auth user_id */
export const findUserByCustomId = async (customId: string): Promise<string | null> => {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('custom_id', customId.toUpperCase())
        .single();

    if (error || !data) {
        return null;
    }

    return data.user_id;
};

/** Retrieve or create a user profile (custom ID) for the authenticated Supabase user */
export const getOrCreateUserProfile = async (supabaseUserId: string): Promise<string | null> => {
    try {
        console.log('[teamService] Getting profile from Supabase...');

        // 1. Try to fetch existing profile
        const { data: existingProfile, error: fetchError } = await supabase
            .from('user_profiles')
            .select('custom_id')
            .eq('user_id', supabaseUserId)
            .single();

        if (existingProfile?.custom_id) {
            console.log('[teamService] Found existing profile:', existingProfile.custom_id);
            return existingProfile.custom_id;
        }

        // 2. Profile not found (PGRST116 error code) - create new one
        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('[teamService] Error fetching profile:', fetchError);
            return null;
        }

        console.log('[teamService] Creating new profile...');
        const customId = generateCustomId();

        const { data: newProfile, error: insertError } = await supabase
            .from('user_profiles')
            .insert({
                user_id: supabaseUserId,
                custom_id: customId
            })
            .select('custom_id')
            .single();

        if (insertError) {
            // Handle race condition - profile might have been created by another request
            if (insertError.code === '23505') {
                const { data: raceProfile } = await supabase
                    .from('user_profiles')
                    .select('custom_id')
                    .eq('user_id', supabaseUserId)
                    .single();
                return raceProfile?.custom_id || null;
            }
            console.error('[teamService] Error creating profile:', insertError);
            return null;
        }

        console.log('[teamService] Created new profile:', newProfile.custom_id);
        return newProfile.custom_id;

    } catch (e) {
        console.error('[teamService] Unexpected error in getOrCreateUserProfile:', e);
        return null;
    }
};

/** Find a team by its owner's custom ID */
export const findTeamByOwnerCustomId = async (ownerCustomId: string): Promise<{ teamId: string; teamName: string } | null> => {
    // First find the owner's user_id
    const ownerUserId = await findUserByCustomId(ownerCustomId);
    if (!ownerUserId) return null;

    // Then find their team
    const { data: team } = await supabase
        .from('teams')
        .select('id, name')
        .eq('owner_user_id', ownerUserId)
        .single();

    if (!team) return null;

    return { teamId: team.id, teamName: team.name };
};

/** Join a team by the owner's custom ID */
export const joinTeamByOwnerCustomId = async (ownerCustomId: string, currentUserId: string): Promise<{ success: boolean; error?: string; team_name?: string }> => {
    try {
        // 1. Find the owner user by their custom_id
        const ownerUserId = await findUserByCustomId(ownerCustomId);
        if (!ownerUserId) {
            return { success: false, error: 'Usuário não encontrado com este ID.' };
        }

        // Prevent joining own team
        if (ownerUserId === currentUserId) {
            return { success: false, error: 'Você não pode entrar no seu próprio time.' };
        }

        // 2. Find the team owned by this user
        const { data: team } = await supabase
            .from('teams')
            .select('id, name')
            .eq('owner_user_id', ownerUserId)
            .single();

        if (!team) {
            return { success: false, error: 'Este usuário não possui um time.' };
        }

        // 3. Check if already a member
        const { data: existingMember } = await supabase
            .from('team_members')
            .select('id')
            .eq('team_id', team.id)
            .eq('user_id', currentUserId)
            .single();

        if (existingMember) {
            return { success: false, error: 'Você já é membro deste time.' };
        }

        // 4. Add user as member
        const { error: insertError } = await supabase
            .from('team_members')
            .insert({
                team_id: team.id,
                user_id: currentUserId,
                role: 'member'
            });

        if (insertError) {
            console.error('[teamService] Error joining team:', insertError);
            return { success: false, error: 'Erro ao entrar no time.' };
        }

        return { success: true, team_name: team.name };
    } catch (e: any) {
        console.error('[teamService] Error in joinTeamByOwnerCustomId:', e);
        return { success: false, error: e.message || 'Erro ao entrar no time.' };
    }
};

/** Get teams for the current user */
export const getUserTeams = async (userId: string) => {
    const { data, error } = await supabase
        .from('team_members')
        .select(`
            role,
            team:teams (
                id,
                name,
                owner_user_id,
                created_at
            )
        `)
        .eq('user_id', userId);

    if (error) {
        console.error('[teamService] Error fetching teams:', error);
        throw new Error(error.message);
    }

    return data?.map(m => ({
        ...m.team,
        role: m.role
    })) || [];
};
