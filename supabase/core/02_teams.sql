-- =============================================
-- GESTÃO BAR - TEAMS MODULE
-- Supabase PostgreSQL
-- =============================================
-- Teams and team membership tables.
-- Enables shared dashboards between users.

-- =============================================
-- TEAMS
-- Shared dashboards/workspaces
-- =============================================
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TEAM MEMBERS
-- Links users to teams with roles
-- =============================================
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL CHECK (role IN ('owner', 'member')),
    allowed_routes TEXT[] DEFAULT NULL, -- null = full access
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- =============================================
-- TRIGGER: Auto-add team owner as member
-- =============================================
CREATE OR REPLACE FUNCTION auto_add_team_owner()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO team_members (team_id, user_id, role)
    VALUES (NEW.id, NEW.owner_user_id, 'owner');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_add_owner ON teams;
CREATE TRIGGER trigger_auto_add_owner
    AFTER INSERT ON teams FOR EACH ROW EXECUTE FUNCTION auto_add_team_owner();
