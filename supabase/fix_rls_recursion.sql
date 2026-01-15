-- FIX RLS INFINITE RECURSION
-- Run this in your Supabase SQL Editor to fix the issue

-- 1. Create SECURITY DEFINER functions to break recursion
CREATE OR REPLACE FUNCTION is_team_owner(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM teams
        WHERE id = p_team_id
        AND owner_user_id = auth.uid()
    );
END;
$$;

CREATE OR REPLACE FUNCTION is_team_member(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM team_members
        WHERE team_id = p_team_id
        AND user_id = auth.uid()
    );
END;
$$;

-- 2. Update Teams Policies
DROP POLICY IF EXISTS "Team members can view teams" ON teams;
CREATE POLICY "Team members can view teams" ON teams
    FOR SELECT USING (is_team_member(id));

-- 3. Update Team Members Policies
DROP POLICY IF EXISTS "Owners can view team members" ON team_members;
CREATE POLICY "Owners can view team members" ON team_members
    FOR SELECT USING (is_team_owner(team_id));

DROP POLICY IF EXISTS "Owners can add team members" ON team_members;
CREATE POLICY "Owners can add team members" ON team_members
    FOR INSERT WITH CHECK (is_team_owner(team_id));
