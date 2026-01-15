-- =============================================
-- FULL DATABASE SCHEMA V2 (Consolidated)
-- =============================================
-- Execute this script in Supabase SQL Editor to reset/setup the database.
-- Includes: User Profiles, Teams, Members, RLS Policies, and Auto-Join Trigger.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES

-- User Profiles (Custom IDs & Display Names)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    custom_id VARCHAR(12) NOT NULL UNIQUE,
    display_name VARCHAR(100), -- Added in V2
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Members (Permissions)
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL CHECK (role IN ('owner','member')),
    allowed_routes TEXT[] DEFAULT NULL, -- Added in V2 (null = all access)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- 3. ROW LEVEL SECURITY (RLS)

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Helper Functions
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

-- User Profiles Policies
DROP POLICY IF EXISTS "Public view profiles" ON user_profiles;
CREATE POLICY "Public view profiles" ON user_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own profile" ON user_profiles;
CREATE POLICY "Users can manage own profile" ON user_profiles
    FOR ALL USING (auth.uid() = user_id);

-- Teams Policies
DROP POLICY IF EXISTS "Users view own teams" ON teams;
CREATE POLICY "Users view own teams" ON teams 
    FOR SELECT USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Members view teams" ON teams;
CREATE POLICY "Members view teams" ON teams 
    FOR SELECT USING (is_team_member(id));

DROP POLICY IF EXISTS "Users insert own teams" ON teams;
CREATE POLICY "Users insert own teams" ON teams 
    FOR INSERT WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own teams" ON teams;
CREATE POLICY "Users update own teams" ON teams 
    FOR UPDATE USING (owner_user_id = auth.uid());

-- Team Members Policies
DROP POLICY IF EXISTS "View memberships" ON team_members;
CREATE POLICY "View memberships" ON team_members 
    FOR SELECT USING (user_id = auth.uid() OR is_team_owner(team_id));

DROP POLICY IF EXISTS "Owners manage members" ON team_members;
CREATE POLICY "Owners manage members" ON team_members 
    FOR ALL USING (is_team_owner(team_id));

-- 4. AUTOMATION & TRIGGERS

-- Trigger: Automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_timestamp BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_teams_timestamp BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: Automatically add Team Owner as a Member
-- This prevents the "Not a team owner" issue by ensuring consistency
CREATE OR REPLACE FUNCTION auto_add_team_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (NEW.id, NEW.owner_user_id, 'owner');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_add_owner ON teams;
CREATE TRIGGER trigger_auto_add_owner
    AFTER INSERT ON teams
    FOR EACH ROW EXECUTE FUNCTION auto_add_team_owner_as_member();
