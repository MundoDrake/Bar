-- =============================================
-- GESTÃO BAR - ROW LEVEL SECURITY (RLS)
-- Supabase PostgreSQL
-- =============================================
-- Security policies for team-based access control.

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_batches ENABLE ROW LEVEL SECURITY;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Check if user is team member
CREATE OR REPLACE FUNCTION is_team_member(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM team_members
        WHERE team_id = p_team_id AND user_id = auth.uid()
    );
END;
$$;

-- Check if user is team owner
CREATE OR REPLACE FUNCTION is_team_owner(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM teams
        WHERE id = p_team_id AND owner_user_id = auth.uid()
    );
END;
$$;

-- =============================================
-- USER PROFILES POLICIES
-- =============================================
DROP POLICY IF EXISTS "Public view profiles" ON user_profiles;
CREATE POLICY "Public view profiles" ON user_profiles
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users manage own profile" ON user_profiles;
CREATE POLICY "Users manage own profile" ON user_profiles
    FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- TEAMS POLICIES
-- =============================================
DROP POLICY IF EXISTS "Users view teams" ON teams;
CREATE POLICY "Users view teams" ON teams
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users insert own teams" ON teams;
CREATE POLICY "Users insert own teams" ON teams
    FOR INSERT WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Owners update teams" ON teams;
CREATE POLICY "Owners update teams" ON teams
    FOR UPDATE USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Owners delete teams" ON teams;
CREATE POLICY "Owners delete teams" ON teams
    FOR DELETE USING (owner_user_id = auth.uid());

-- =============================================
-- TEAM MEMBERS POLICIES
-- =============================================
DROP POLICY IF EXISTS "View own memberships" ON team_members;
CREATE POLICY "View own memberships" ON team_members
    FOR SELECT USING (user_id = auth.uid() OR is_team_owner(team_id));

DROP POLICY IF EXISTS "Users join teams" ON team_members;
CREATE POLICY "Users join teams" ON team_members
    FOR INSERT WITH CHECK (user_id = auth.uid() OR is_team_owner(team_id));

DROP POLICY IF EXISTS "Owners manage members" ON team_members;
CREATE POLICY "Owners manage members" ON team_members
    FOR ALL USING (is_team_owner(team_id));

DROP POLICY IF EXISTS "Users leave teams" ON team_members;
CREATE POLICY "Users leave teams" ON team_members
    FOR DELETE USING (user_id = auth.uid());

-- =============================================
-- USER PREFERENCES POLICIES
-- =============================================
DROP POLICY IF EXISTS "Users manage preferences" ON user_preferences;
CREATE POLICY "Users manage preferences" ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- PRODUCTS POLICIES (Team-based)
-- =============================================
DROP POLICY IF EXISTS "Team members view products" ON products;
CREATE POLICY "Team members view products" ON products
    FOR SELECT USING (is_team_member(team_id) OR user_id = auth.uid());

DROP POLICY IF EXISTS "Team members manage products" ON products;
CREATE POLICY "Team members manage products" ON products
    FOR ALL USING (is_team_member(team_id) OR user_id = auth.uid());

-- =============================================
-- STOCK POLICIES (Through products)
-- =============================================
DROP POLICY IF EXISTS "Team members view stock" ON stock;
CREATE POLICY "Team members view stock" ON stock
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM products WHERE products.id = stock.product_id 
                AND (is_team_member(products.team_id) OR products.user_id = auth.uid()))
    );

DROP POLICY IF EXISTS "Team members manage stock" ON stock;
CREATE POLICY "Team members manage stock" ON stock
    FOR ALL USING (
        EXISTS (SELECT 1 FROM products WHERE products.id = stock.product_id 
                AND (is_team_member(products.team_id) OR products.user_id = auth.uid()))
    );

-- =============================================
-- STOCK MOVEMENTS POLICIES
-- =============================================
DROP POLICY IF EXISTS "Team members view movements" ON stock_movements;
CREATE POLICY "Team members view movements" ON stock_movements
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM products WHERE products.id = stock_movements.product_id 
                AND (is_team_member(products.team_id) OR products.user_id = auth.uid()))
    );

DROP POLICY IF EXISTS "Team members manage movements" ON stock_movements;
CREATE POLICY "Team members manage movements" ON stock_movements
    FOR ALL USING (
        EXISTS (SELECT 1 FROM products WHERE products.id = stock_movements.product_id 
                AND (is_team_member(products.team_id) OR products.user_id = auth.uid()))
    );

-- =============================================
-- PRODUCT BATCHES POLICIES
-- =============================================
DROP POLICY IF EXISTS "Team members view batches" ON product_batches;
CREATE POLICY "Team members view batches" ON product_batches
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM products WHERE products.id = product_batches.product_id 
                AND (is_team_member(products.team_id) OR products.user_id = auth.uid()))
    );

DROP POLICY IF EXISTS "Team members manage batches" ON product_batches;
CREATE POLICY "Team members manage batches" ON product_batches
    FOR ALL USING (
        EXISTS (SELECT 1 FROM products WHERE products.id = product_batches.product_id 
                AND (is_team_member(products.team_id) OR products.user_id = auth.uid()))
    );
