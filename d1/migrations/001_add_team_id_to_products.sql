-- Migration: Add team_id to products and update schema
-- This migration changes products to belong to teams instead of users

-- Step 1: Add team_id column to products (nullable initially for migration)
ALTER TABLE products ADD COLUMN team_id TEXT;

-- Step 2: Create index for team_id
CREATE INDEX IF NOT EXISTS idx_products_team ON products(team_id);

-- Note: After adding team_id, we need to populate it based on existing data.
-- For existing products, we'll associate them with the owner's team.
-- This should be done via a script or the app will handle it.
