-- =============================================
-- GESTÃO BAR - TRIGGERS & FUNCTIONS
-- Supabase PostgreSQL
-- =============================================
-- Utility triggers and RPC functions.

-- =============================================
-- UPDATED_AT TRIGGER
-- Auto-update updated_at on row changes
-- =============================================
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

-- =============================================
-- RPC FUNCTIONS
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
