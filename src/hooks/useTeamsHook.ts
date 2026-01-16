// src/hooks/useTeams.ts

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Team, TeamMember } from '../types/database';
import { useAuth } from '../contexts/AuthContext';

// Extended member type with display name from user_profiles
export interface TeamMemberWithProfile extends TeamMember {
    display_name?: string | null;
    custom_id?: string;
}

export const useTeams = () => {
    const { user, session } = useAuth();
    const [teams, setTeams] = useState<Team[]>([]);
    const [members, setMembers] = useState<Record<string, TeamMemberWithProfile[]>>({});
    const [currentMember, setCurrentMember] = useState<TeamMemberWithProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetch = useCallback(async () => {
        // If no user or session, don't try to fetch - just set empty state
        if (!user?.id || !session?.access_token) {
            setTeams([]);
            setMembers({});
            setCurrentMember(null);
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
            // Fetch teams from Supabase directly
            const { data: teamMemberships, error } = await supabase
                .from('team_members')
                .select(`
                    role,
                    team:teams (
                        id,
                        name,
                        owner_user_id,
                        created_at,
                        updated_at
                    )
                `)
                .eq('user_id', user.id);

            if (error) {
                console.error('[useTeams] Error fetching teams:', error);
                throw error;
            }

            if (!teamMemberships || teamMemberships.length === 0) {
                setTeams([]);
                setMembers({});
                setCurrentMember(null);
                setLoading(false);
                return;
            }

            // Extract teams from memberships
            const teamRows: Team[] = teamMemberships
                .filter(m => m.team)
                .map(m => m.team as unknown as Team);

            setTeams(teamRows);

            // Set current user's role based on first team membership
            const firstMembership = teamMemberships[0];
            if (firstMembership && firstMembership.team) {
                const team = firstMembership.team as unknown as Team;
                setCurrentMember({
                    id: '',
                    team_id: team.id,
                    user_id: user.id,
                    role: firstMembership.role as 'owner' | 'member',
                    allowed_routes: null,
                    created_at: ''
                });
            }

            // Note: For now we're not fetching full member details
            const membersMap: Record<string, TeamMemberWithProfile[]> = {};
            setMembers(membersMap);

        } catch (err) {
            console.error('[useTeams] Error fetching teams:', err);
            setTeams([]);
            setMembers({});
        } finally {
            setLoading(false);
        }
    }, [user?.id, session?.access_token]);

    // Update member permissions (owner only) - placeholder for now
    const updateMemberPermissions = useCallback(async (
        teamId: string,
        memberId: string,
        allowedRoutes: string[] | null
    ) => {
        // TODO: Implement via Supabase
        console.warn('[useTeams] updateMemberPermissions not implemented yet');
        return { error: 'Funcionalidade em desenvolvimento' };
    }, []);

    useEffect(() => {
        fetch();
    }, [fetch]);

    // Check if current user is owner of any team
    const isOwner = teams.some(t => t.owner_user_id === user?.id);

    return {
        teams,
        members,
        loading,
        refresh: fetch,
        currentMember,
        isOwner,
        updateMemberPermissions
    };
};
