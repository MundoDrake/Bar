-- =============================================
-- BAR STOCK MANAGER - DATABASE SCHEMA
-- Supabase PostgreSQL
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USER PROFILES TABLE (custom IDs)
-- Stores a unique custom identifier per user for team features
-- =============================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    custom_id VARCHAR(12) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can view other profiles (for team invites by custom_id)
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
CREATE POLICY "Users can view all profiles" ON user_profiles
    FOR SELECT USING (true);

-- =============================================
-- TEAMS TABLE
-- Represents a team (group of users) for shared inventory
-- =============================================
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TEAM MEMBERS TABLE
-- Links users to teams with roles
-- =============================================
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL CHECK (role IN ('owner','member')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- Now enable RLS and create policies (after both tables exist)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Team owners can view their teams
DROP POLICY IF EXISTS "Users can view own teams" ON teams;
CREATE POLICY "Users can view own teams" ON teams
    FOR SELECT USING (owner_user_id = auth.uid());

-- Team owners can insert teams
DROP POLICY IF EXISTS "Users can insert own teams" ON teams;
CREATE POLICY "Users can insert own teams" ON teams
    FOR INSERT WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own teams" ON teams;
CREATE POLICY "Users can update own teams" ON teams
    FOR UPDATE USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Team members can view teams" ON teams;
CREATE POLICY "Team members can view teams" ON teams
    FOR SELECT USING (is_team_member(id));  -- Use function to avoid direct table recursion


-- TEAM MEMBERS POLICIES
DROP POLICY IF EXISTS "Users can view own memberships" ON team_members;
CREATE POLICY "Users can view own memberships" ON team_members
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Owners can view team members" ON team_members;
CREATE POLICY "Owners can view team members" ON team_members
    FOR SELECT USING (is_team_owner(team_id));  -- Use function to avoid direct table recursion

DROP POLICY IF EXISTS "Users can insert own membership" ON team_members;
CREATE POLICY "Users can insert own membership" ON team_members
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Owners can add team members" ON team_members;
CREATE POLICY "Owners can add team members" ON team_members
    FOR INSERT WITH CHECK (is_team_owner(team_id));

DROP POLICY IF EXISTS "Users can delete own membership" ON team_members;
CREATE POLICY "Users can delete own membership" ON team_members
    FOR DELETE USING (user_id = auth.uid());

-- Trigger to update updated_at on user_profiles, teams
CREATE OR REPLACE FUNCTION update_team_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trigger_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_team_updated_at();

DROP TRIGGER IF EXISTS trigger_teams_updated_at ON teams;
CREATE TRIGGER trigger_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_team_updated_at();

-- =============================================
-- PRODUCTS TABLE
-- Stores all products (beverages, ingredients, supplies)
-- =============================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    min_stock_level DECIMAL(10, 2) DEFAULT 0,
    expiry_tracking BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- =============================================
-- STOCK TABLE
-- Current stock levels for each product
-- =============================================
CREATE TABLE IF NOT EXISTS stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_stock_product_id ON stock(product_id);

-- =============================================
-- STOCK MOVEMENTS TABLE
-- History of all stock entries and exits
-- =============================================
CREATE TYPE movement_type AS ENUM ('entrada', 'saida', 'perda', 'ajuste');

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

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_type ON stock_movements(type);
CREATE INDEX IF NOT EXISTS idx_movements_created_at ON stock_movements(created_at);

-- =============================================
-- PRODUCT BATCHES TABLE
-- Tracks batches with expiry dates (FIFO)
-- =============================================
CREATE TABLE IF NOT EXISTS product_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
    expiry_date DATE,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for expiry tracking
CREATE INDEX IF NOT EXISTS idx_batches_product_id ON product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry_date ON product_batches(expiry_date);

-- =============================================
-- USER PREFERENCES TABLE
-- Notification and alert settings
-- =============================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    alert_low_stock BOOLEAN DEFAULT TRUE,
    alert_expiry BOOLEAN DEFAULT TRUE,
    alert_expiry_days INTEGER DEFAULT 7,
    alert_ai_suggestions BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- Isolate data by user
-- =============================================

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Products policies
CREATE POLICY "Users can view own products" ON products
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own products" ON products
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products" ON products
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own products" ON products
    FOR DELETE USING (auth.uid() = user_id);

-- Stock policies (through products relationship)
CREATE POLICY "Users can view own stock" ON stock
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM products
            WHERE products.id = stock.product_id
            AND products.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own stock" ON stock
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM products
            WHERE products.id = stock.product_id
            AND products.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own stock" ON stock
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM products
            WHERE products.id = stock.product_id
            AND products.user_id = auth.uid()
        )
    );

-- Stock movements policies
CREATE POLICY "Users can view own movements" ON stock_movements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM products
            WHERE products.id = stock_movements.product_id
            AND products.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own movements" ON stock_movements
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM products
            WHERE products.id = stock_movements.product_id
            AND products.user_id = auth.uid()
        )
    );

-- Product batches policies
CREATE POLICY "Users can view own batches" ON product_batches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM products
            WHERE products.id = product_batches.product_id
            AND products.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own batches" ON product_batches
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM products
            WHERE products.id = product_batches.product_id
            AND products.user_id = auth.uid()
        )
    );

-- User preferences policies
CREATE POLICY "Users can view own preferences" ON user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to products table
CREATE TRIGGER trigger_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Apply trigger to user_preferences table
CREATE TRIGGER trigger_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- =============================================
-- RPC FUNCTIONS
-- Atomic operations for stock management
-- =============================================

-- Register stock movement and update stock atomically
CREATE OR REPLACE FUNCTION register_stock_movement(
    p_product_id UUID,
    p_type movement_type,
    p_quantity DECIMAL,
    p_reason VARCHAR DEFAULT NULL,
    p_expiry_date DATE DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    movement_id UUID;
    current_qty DECIMAL;
    new_qty DECIMAL;
BEGIN
    -- Get current stock quantity
    SELECT COALESCE(quantity, 0) INTO current_qty
    FROM stock WHERE product_id = p_product_id;
    
    -- Calculate new quantity based on movement type
    IF p_type = 'entrada' THEN
        new_qty := current_qty + p_quantity;
    ELSIF p_type IN ('saida', 'perda') THEN
        IF current_qty < p_quantity THEN
            RAISE EXCEPTION 'Estoque insuficiente. Disponível: %, Solicitado: %', current_qty, p_quantity;
        END IF;
        new_qty := current_qty - p_quantity;
    ELSE -- ajuste
        new_qty := p_quantity;
    END IF;
    
    -- Insert movement record
    INSERT INTO stock_movements (product_id, type, quantity, reason, expiry_date, notes)
    VALUES (p_product_id, p_type, p_quantity, p_reason, p_expiry_date, p_notes)
    RETURNING id INTO movement_id;
    
    -- Update or insert stock
    INSERT INTO stock (product_id, quantity, updated_at)
    VALUES (p_product_id, new_qty, NOW())
    ON CONFLICT (product_id)
    DO UPDATE SET quantity = new_qty, updated_at = NOW();
    
    RETURN movement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get products with low stock
CREATE OR REPLACE FUNCTION get_low_stock_products(p_user_id UUID)
RETURNS TABLE (
    product_id UUID,
    product_name VARCHAR,
    category VARCHAR,
    unit VARCHAR,
    current_quantity DECIMAL,
    min_stock_level DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.category,
        p.unit,
        COALESCE(s.quantity, 0),
        p.min_stock_level
    FROM products p
    LEFT JOIN stock s ON s.product_id = p.id
    WHERE p.user_id = p_user_id
    AND p.min_stock_level > 0
    AND COALESCE(s.quantity, 0) <= p.min_stock_level
    ORDER BY (COALESCE(s.quantity, 0) / NULLIF(p.min_stock_level, 0)) ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get products expiring soon
CREATE OR REPLACE FUNCTION get_expiring_products(p_user_id UUID, p_days INTEGER DEFAULT 7)
RETURNS TABLE (
    product_id UUID,
    product_name VARCHAR,
    batch_id UUID,
    quantity DECIMAL,
    expiry_date DATE,
    days_until_expiry INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        pb.id,
        pb.quantity,
        pb.expiry_date,
        (pb.expiry_date - CURRENT_DATE)::INTEGER
    FROM products p
    JOIN product_batches pb ON pb.product_id = p.id
    WHERE p.user_id = p_user_id
    AND pb.expiry_date IS NOT NULL
    AND pb.expiry_date <= (CURRENT_DATE + p_days)
    AND pb.quantity > 0
    ORDER BY pb.expiry_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get stock summary for dashboard
CREATE OR REPLACE FUNCTION get_stock_summary(p_user_id UUID)
RETURNS TABLE (
    total_products BIGINT,
    low_stock_count BIGINT,
    expiring_soon_count BIGINT,
    total_movements_today BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM products WHERE user_id = p_user_id),
        (SELECT COUNT(*) FROM get_low_stock_products(p_user_id)),
        (SELECT COUNT(*) FROM get_expiring_products(p_user_id, 7)),
        (SELECT COUNT(*) 
         FROM stock_movements sm
         JOIN products p ON p.id = sm.product_id
         WHERE p.user_id = p_user_id
         AND sm.created_at >= CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;