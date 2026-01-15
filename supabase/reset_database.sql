-- =============================================
-- RESET DATABASE - DELETE ALL TABLES AND DATA
-- WARNING: This will permanently delete ALL data!
-- =============================================

-- Drop specific RLS helper functions (security definers)
DROP FUNCTION IF EXISTS is_team_owner(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_team_member(UUID) CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_user_profiles_updated_at ON user_profiles;
DROP TRIGGER IF EXISTS trigger_teams_updated_at ON teams;
DROP TRIGGER IF EXISTS trigger_products_updated_at ON products;
DROP TRIGGER IF EXISTS trigger_preferences_updated_at ON user_preferences;
DROP TRIGGER IF EXISTS trigger_auto_add_owner ON teams; -- New trigger V2

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS auto_add_team_owner_as_member() CASCADE; -- New function V2
DROP FUNCTION IF EXISTS register_stock_movement(UUID, movement_type, DECIMAL, VARCHAR, DATE, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_low_stock_products(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_expiring_products(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_stock_summary(UUID) CASCADE;

-- Drop tables (order matters due to foreign keys, but CASCADE handles depends)
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS product_batches CASCADE;
DROP TABLE IF EXISTS stock CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS movement_type CASCADE;

-- Clean Extensions (Optional - usually keep uuid-ossp)
-- DROP EXTENSION IF EXISTS "uuid-ossp";

-- Verify
SELECT 'Database reset complete! Now run 00_full_schema_v2.sql' AS status;
