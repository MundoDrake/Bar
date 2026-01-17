-- =============================================
-- GESTÃO BAR - PRODUCTS & STOCK
-- Supabase PostgreSQL
-- =============================================
-- Products, stock levels, movements, and batches.

-- =============================================
-- PRODUCTS
-- Shared by team via team_id
-- =============================================
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

-- =============================================
-- STOCK
-- Current stock levels
-- =============================================
CREATE TABLE IF NOT EXISTS stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- STOCK MOVEMENTS
-- History of all stock changes
-- =============================================
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

-- =============================================
-- PRODUCT BATCHES
-- For expiry tracking
-- =============================================
CREATE TABLE IF NOT EXISTS product_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
    expiry_date DATE,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_products_team_id ON products(team_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_stock_product_id ON stock(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_created_at ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_batches_product_id ON product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry_date ON product_batches(expiry_date);
