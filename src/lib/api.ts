// src/lib/api.ts
// Simplified version - only contains local state management for active team
// All API calls now go directly through Supabase

// Key for storing active team in localStorage
const ACTIVE_TEAM_KEY = 'active_team_id';

/**
 * Get the active team ID from localStorage
 */
export function getActiveTeamId(): string | null {
    return localStorage.getItem(ACTIVE_TEAM_KEY);
}

/**
 * Set the active team ID in localStorage
 */
export function setActiveTeamId(teamId: string | null): void {
    if (teamId) {
        localStorage.setItem(ACTIVE_TEAM_KEY, teamId);
    } else {
        localStorage.removeItem(ACTIVE_TEAM_KEY);
    }
}
