-- =============================================
-- GESTÃO BAR - FULL DATABASE SCHEMA V3
-- Supabase PostgreSQL (Vercel Model)
-- =============================================
-- Execute this in Supabase SQL Editor to setup the database.
-- This is a consolidated schema optimized for team-based access.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 2. TABLES
-- =============================================

-- User Profiles (Custom IDs for team invites)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    custom_id VARCHAR(12) NOT NULL UNIQUE,
    display_name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams (Shared dashboards)
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Members (Links users to teams)
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL CHECK (role IN ('owner', 'member')),
    allowed_routes TEXT[] DEFAULT NULL, -- null = full access
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- User Preferences (Alert settings)
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    alert_low_stock BOOLEAN DEFAULT TRUE,
    alert_expiry BOOLEAN DEFAULT TRUE,
    alert_expiry_days INTEGER DEFAULT 7,
    alert_ai_suggestions BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products (Shared by team via team_id)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Creator
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE, -- Team ownership
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    min_stock_level DECIMAL(10, 2) DEFAULT 0,
    expiry_tracking BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock (Current levels)
CREATE TABLE IF NOT EXISTS stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock Movements (History)
DO $$ BEGIN
    CREATE TYPE movement_type AS ENUM ('entrada', 'saida', 'perda', 'ajuste');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    type movement_type NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    reason VARCHAR(255),
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Batches (Expiry tracking)
CREATE TABLE IF NOT EXISTS product_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
    expiry_date DATE,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_products_team_id ON products(team_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_stock_product_id ON stock(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_created_at ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_batches_product_id ON product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry_date ON product_batches(expiry_date);

-- =============================================
-- 4. ROW LEVEL SECURITY
-- =============================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_batches ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user is team member
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

-- Helper function: Check if user is team owner
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
-- 5. POLICIES
-- =============================================

-- USER PROFILES
DROP POLICY IF EXISTS "Public view profiles" ON user_profiles;
CREATE POLICY "Public view profiles" ON user_profiles
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users manage own profile" ON user_profiles;
CREATE POLICY "Users manage own profile" ON user_profiles
    FOR ALL USING (auth.uid() = user_id);

-- TEAMS (Allow anyone to view for join flow)
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

-- TEAM MEMBERS
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

-- USER PREFERENCES
DROP POLICY IF EXISTS "Users manage preferences" ON user_preferences;
CREATE POLICY "Users manage preferences" ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- PRODUCTS (Team-based access)
DROP POLICY IF EXISTS "Team members view products" ON products;
CREATE POLICY "Team members view products" ON products
    FOR SELECT USING (is_team_member(team_id) OR user_id = auth.uid());

DROP POLICY IF EXISTS "Team members manage products" ON products;
CREATE POLICY "Team members manage products" ON products
    FOR ALL USING (is_team_member(team_id) OR user_id = auth.uid());

-- STOCK (Through products)
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

-- STOCK MOVEMENTS
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

-- PRODUCT BATCHES
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

-- =============================================
-- 6. TRIGGERS
-- =============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_profiles_updated ON user_profiles;
CREATE TRIGGER trigger_user_profiles_updated
    BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_teams_updated ON teams;
CREATE TRIGGER trigger_teams_updated
    BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_products_updated ON products;
CREATE TRIGGER trigger_products_updated
    BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_preferences_updated ON user_preferences;
CREATE TRIGGER trigger_preferences_updated
    BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-add team owner as member
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

-- =============================================
-- 7. RPC FUNCTIONS
-- =============================================

-- Get stock summary for dashboard
CREATE OR REPLACE FUNCTION get_stock_summary(p_team_id UUID)
RETURNS TABLE (
    total_products BIGINT,
    low_stock_count BIGINT,
    expiring_soon_count BIGINT,
    total_movements_today BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM products WHERE team_id = p_team_id),
        (SELECT COUNT(*) FROM products p 
         JOIN stock s ON s.product_id = p.id
         WHERE p.team_id = p_team_id AND s.quantity <= p.min_stock_level),
        (SELECT COUNT(*) FROM product_batches pb
         JOIN products p ON p.id = pb.product_id
         WHERE p.team_id = p_team_id AND pb.expiry_date <= CURRENT_DATE + 7),
        (SELECT COUNT(*) FROM stock_movements sm
         JOIN products p ON p.id = sm.product_id
         WHERE p.team_id = p_team_id AND sm.created_at >= CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- DONE
-- =============================================
