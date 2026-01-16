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
    const { user } = useAuth();
    const [teams, setTeams] = useState<Team[]>([]);
    const [members, setMembers] = useState<Record<string, TeamMemberWithProfile[]>>({});
    const [currentMember, setCurrentMember] = useState<TeamMemberWithProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetch = useCallback(async () => {
        setLoading(true);
        if (!user?.id) {
            setLoading(false);
            return;
        }

        try {
            // Get team memberships for this user
            const { data: memberRows, error: memErr } = await supabase
                .from('team_members')
                .select('team_id, allowed_routes')
                .eq('user_id', user.id);

            if (memErr) {
                console.error('[useTeams] Error fetching members:', memErr);
                setLoading(false);
                return;
            }

            const teamIds = memberRows.map((r: { team_id: string }) => r.team_id);

            // Set current user's membership info (for route filtering)
            if (memberRows.length > 0) {
                const myMembership = memberRows[0] as { team_id: string; allowed_routes: string[] | null };
                setCurrentMember({
                    id: '',
                    team_id: myMembership.team_id,
                    user_id: user.id,
                    role: 'member', // Will be updated below
                    allowed_routes: myMembership.allowed_routes,
                    created_at: ''
                });
            }

            if (teamIds.length === 0) {
                setTeams([]);
                setMembers({});
                setLoading(false);
                return;
            }

            const { data: teamRows, error: teamErr } = await supabase
                .from('teams')
                .select('*')
                .in('id', teamIds);

            if (teamErr) {
                console.error('[useTeams] Error fetching teams:', teamErr);
                setLoading(false);
                return;
            }

            setTeams(teamRows as Team[]);

            // Check if current user is owner
            const isOwner = (teamRows as Team[]).some(t => t.owner_user_id === user.id);
            setCurrentMember(prev => {
                if (!prev) return null;
                return { ...prev, role: isOwner ? 'owner' : 'member' };
            });

            // Load members for each team with profile info
            const membersMap: Record<string, TeamMemberWithProfile[]> = {};
            for (const t of teamRows as Team[]) {
                const { data: mems, error } = await supabase
                    .from('team_members')
                    .select('*')
                    .eq('team_id', t.id);

                if (!error && mems) {
                    // Fetch display names from user_profiles
                    const membersWithProfiles: TeamMemberWithProfile[] = [];
                    for (const mem of mems) {
                        const { data: profile } = await supabase
                            .from('user_profiles')
                            .select('display_name, custom_id')
                            .eq('user_id', mem.user_id)
                            .maybeSingle();

                        membersWithProfiles.push({
                            ...mem,
                            display_name: profile?.display_name || null,
                            custom_id: profile?.custom_id || undefined
                        });
                    }
                    membersMap[t.id] = membersWithProfiles;
                }
            }
            setMembers(membersMap);
        } catch (err) {
            console.error('[useTeams] Unexpected error:', err);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    // Update member permissions (owner only)
    const updateMemberPermissions = useCallback(async (
        teamId: string,
        memberId: string,
        allowedRoutes: string[] | null
    ) => {
        try {
            const { error } = await supabase
                .from('team_members')
                .update({ allowed_routes: allowedRoutes })
                .eq('id', memberId)
                .eq('team_id', teamId);

            if (error) throw error;

            await fetch(); // Refresh data
            return { error: null };
        } catch (err) {
            console.error('[useTeams] Error updating permissions:', err);
            return { error: 'Erro ao atualizar permissões' };
        }
    }, [fetch]);

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
