-- =============================================
-- FIX: ALLOW NEW MEMBERS TO FIND TEAMS
-- RLS prevents non-members from seeing teams, so we use a Secure RPC.
-- =============================================

CREATE OR REPLACE FUNCTION get_team_public_info(owner_custom_id TEXT)
RETURNS TABLE (team_id UUID, team_name VARCHAR, owner_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (bypass RLS)
SET search_path = public
AS $$
DECLARE
    found_owner_id UUID;
BEGIN
    -- 1. Find the owner's UUID from their custom ID
    SELECT user_id INTO found_owner_id
    FROM user_profiles
    WHERE custom_id = owner_custom_id
    LIMIT 1;

    IF found_owner_id IS NULL THEN
        RETURN; -- No user found
    END IF;

    -- 2. Return the team belonging to this owner
    RETURN QUERY
    SELECT t.id, t.name, t.owner_user_id
    FROM teams t
    WHERE t.owner_user_id = found_owner_id
    LIMIT 1;
END;
$$;
