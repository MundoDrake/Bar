// src/services/teamService.ts
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';

/** Generate a unique custom ID for a user (8-character alphanumeric + timestamp suffix) */
export const generateCustomId = (): string => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randomPart = Array.from({ length: 6 }, () => charset[Math.floor(Math.random() * charset.length)]).join('');
    const timePart = Date.now().toString(36).slice(-2).toUpperCase();
    return randomPart + timePart;
};

/** Create a new team and add the owner as a member */
export const createTeam = async (ownerUserId: string, name: string) => {
    // Insert team (the database trigger auto_add_team_owner_as_member
    // automatically adds the owner as a team member)
    const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({ name, owner_user_id: ownerUserId })
        .select()
        .single();

    if (teamError) {
        console.error('[teamService] Error creating team:', teamError);
        throw new Error(teamError.message);
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
    // Add timeout to prevent infinite loading
    const timeoutMs = 10000;

    const profilePromise = async (): Promise<string | null> => {
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

    // Race between profile fetch and timeout
    try {
        const result = await Promise.race([
            profilePromise(),
            new Promise<null>((_, reject) =>
                setTimeout(() => reject(new Error('Profile fetch timeout')), timeoutMs)
            )
        ]);
        return result;
    } catch (e) {
        console.error('[teamService] Profile fetch timed out after', timeoutMs, 'ms');
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
export const joinTeamByOwnerCustomId = async (ownerCustomId: string, _currentUserId: string): Promise<{ success: boolean; error?: string; team_name?: string; team_id?: string }> => {
    try {
        const data = await apiFetch<{ success: boolean; team_id: string; team_name: string; message: string }>('/teams/join', {
            method: 'POST',
            body: JSON.stringify({
                owner_custom_id: ownerCustomId
            })
        });
        return { success: true, team_name: data.team_name, team_id: data.team_id };
    } catch (e: any) {
        console.error('[teamService] Error in joinTeamByOwnerCustomId:', e);
        // Extract error message if available
        const errorMessage = e.message || 'Erro ao entrar no time.';
        return { success: false, error: errorMessage };
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
