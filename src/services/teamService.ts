// src/services/teamService.ts

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
    // ownerUserId is unused here because the API takes it from the Auth Token
    return apiFetch('/teams', {
        method: 'POST',
        body: JSON.stringify({ name })
    });
};

/** Invite/add a member to an existing team by their user ID */
export const addMemberToTeam = async (teamId: string, memberUserId: string) => {
    return apiFetch(`/teams/${teamId}/members`, {
        method: 'POST',
        body: JSON.stringify({ user_id: memberUserId })
    });
};

/** Find a user by their custom_id and return their auth user_id */
export const findUserByCustomId = async (customId: string): Promise<string | null> => {
    // TODO: Add endpoint for looking up users by custom ID publicly or secured
    console.warn('findUserByCustomId via API not fully implemented yet');
    return null;
};

/** Retrieve or create a user profile (custom ID) for the authenticated Supabase user */
export const getOrCreateUserProfile = async (supabaseUserId: string): Promise<string | null> => {
    try {
        console.log('[teamService] Getting profile via API...');

        // 1. Try to fetch existing
        try {
            const profile = await apiFetch<{ custom_id: string }>('/users/profile');
            if (profile && profile.custom_id) {
                return profile.custom_id;
            }
        } catch (e: any) {
            // 404 means not found
            if (!e.message.includes('404')) {
                console.error('[teamService] Error fetching profile:', e);
                return null;
            }
        }

        // 2. Create if 404 or missing
        console.log('[teamService] Creating new profile via API...');
        const customId = generateCustomId();

        const result = await apiFetch<{ success: boolean; custom_id: string }>('/users/profile', {
            method: 'POST',
            body: JSON.stringify({ custom_id })
        });

        return result.custom_id;

    } catch (e) {
        console.error('[teamService] Unexpected error in getOrCreateUserProfile:', e);
        return null;
    }
};

/** Find a team by its owner's custom ID */
export const findTeamByOwnerCustomId = async (ownerCustomId: string): Promise<{ teamId: string; teamName: string } | null> => {
    // RPC replacement: /api/teams/lookup?owner_code=...
    console.warn('findTeamByOwnerCustomId via API not implemented');
    return null;
};

/** Join a team by the owner's custom ID */
export const joinTeamByOwnerCustomId = async (ownerCustomId: string, currentUserId: string): Promise<{ success: boolean; error?: string }> => {
    // This logic depended on finding the team first.
    return { success: false, error: 'Funcionalidade em migração.' };
};
