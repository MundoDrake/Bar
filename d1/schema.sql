-- Cloudflare D1 Schema (SQLite)

-- Users table (mirrors Supabase Auth for referential integrity, but managed by our Worker)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, -- Supabase UUID
    email TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    last_seen_at TEXT DEFAULT (datetime('now'))
);

-- User Profiles (Custom IDs)
CREATE TABLE IF NOT EXISTS user_profiles (
    id TEXT PRIMARY KEY, -- UUID
    user_id TEXT NOT NULL,
    custom_id TEXT NOT NULL UNIQUE,
    display_name TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY, -- UUID
    name TEXT NOT NULL,
    owner_user_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Team Members
CREATE TABLE IF NOT EXISTS team_members (
    id TEXT PRIMARY KEY, -- UUID
    team_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner','member')),
    allowed_routes TEXT, -- JSON array stored as text
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(team_id, user_id)
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY, -- UUID
    user_id TEXT NOT NULL, -- Owner (or team context if we decide to link to teams later)
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit TEXT NOT NULL,
    min_stock_level REAL DEFAULT 0,
    expiry_tracking INTEGER DEFAULT 0, -- Boolean 0/1
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Stock (Current Levels)
CREATE TABLE IF NOT EXISTS stock (
    id TEXT PRIMARY KEY, -- UUID
    product_id TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(product_id)
);

-- Stock Movements
CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY, -- UUID
    product_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('entrada', 'saida', 'perda', 'ajuste')),
    quantity REAL NOT NULL,
    reason TEXT,
    expiry_date TEXT, -- ISO Date String YYYY-MM-DD
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Product Batches
CREATE TABLE IF NOT EXISTS product_batches (
    id TEXT PRIMARY KEY, -- UUID
    product_id TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    expiry_date TEXT,
    received_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- User Preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id TEXT PRIMARY KEY, -- UUID
    user_id TEXT NOT NULL,
    alert_low_stock INTEGER DEFAULT 1, -- Boolean
    alert_expiry INTEGER DEFAULT 1, -- Boolean
    alert_expiry_days INTEGER DEFAULT 7,
    alert_ai_suggestions INTEGER DEFAULT 1, -- Boolean
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_product ON stock(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_batches_product ON product_batches(product_id);
