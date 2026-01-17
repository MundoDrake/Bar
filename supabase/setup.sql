-- =============================================
-- GESTÃO BAR - FULL SETUP SCRIPT
-- Supabase PostgreSQL
-- =============================================
-- Run this single file to set up the entire database.
-- Alternatively, run files in /core/ folder individually.

-- Load core modules in order
\i core/01_users.sql
\i core/02_teams.sql
\i core/03_products.sql
\i core/04_rls_policies.sql
\i core/05_triggers_functions.sql

-- Done!
-- To verify, run: SELECT * FROM pg_tables WHERE schemaname = 'public';
