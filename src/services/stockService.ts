// src/services/stockService.ts
import { supabase } from '../lib/supabase';
import type { StockMovementFormData, StockMovement, LowStockProduct, StockSummary } from '../types/database';

export const stockServices = {
    /**
     * Register a stock movement and update stock levels atomically
     */
    registerMovement: async (data: StockMovementFormData): Promise<{ success: true }> => {
        // Use the RPC function for atomic operation
        const { error } = await supabase.rpc('register_stock_movement', {
            p_product_id: data.product_id,
            p_type: data.type,
            p_quantity: data.quantity,
            p_reason: data.reason || null,
            p_expiry_date: data.expiry_date || null,
            p_notes: data.notes || null
        });

        if (error) {
            console.error('[stockService] Error registering movement:', error);
            throw new Error(error.message);
        }

        return { success: true };
    },

    /**
     * Get movement history for the user's team
     */
    getMovements: async (): Promise<(StockMovement & { product: { name: string } })[]> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Get user's team membership
        const { data: membership } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', user.id)
            .limit(1)
            .single();

        if (!membership) {
            // User has no team - return empty array
            return [];
        }

        // Get movements for team's products (using team_id for proper sharing)
        const { data, error } = await supabase
            .from('stock_movements')
            .select(`
                *,
                products!inner (
                    name,
                    team_id
                )
            `)
            .eq('products.team_id', membership.team_id)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('[stockService] Error fetching movements:', error);
            throw new Error(error.message);
        }

        return (data || []).map(m => ({
            ...m,
            product: { name: (m.products as any)?.name || 'Unknown' }
        }));
    },

    /**
     * Get low stock alerts and summary for dashboard
     */
    getAlerts: async (): Promise<{ lowStock: LowStockProduct[]; summary: StockSummary }> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return {
                lowStock: [],
                summary: { total_products: 0, low_stock_count: 0, expiring_soon_count: 0, total_movements_today: 0 }
            };
        }

        // Get user's team
        const { data: membership } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', user.id)
            .limit(1)
            .single();

        if (!membership) {
            // User has no team - return empty data
            return {
                lowStock: [],
                summary: { total_products: 0, low_stock_count: 0, expiring_soon_count: 0, total_movements_today: 0 }
            };
        }

        // Get products with stock using team_id for proper sharing
        const { data: products } = await supabase
            .from('products')
            .select(`
                id,
                name,
                category,
                unit,
                min_stock_level,
                stock (quantity)
            `)
            .eq('team_id', membership.team_id)
            .gt('min_stock_level', 0);

        const lowStock: LowStockProduct[] = (products || [])
            .filter(p => {
                const qty = Array.isArray(p.stock) ? p.stock[0]?.quantity || 0 : 0;
                return qty <= p.min_stock_level;
            })
            .map(p => ({
                product_id: p.id,
                product_name: p.name,
                category: p.category,
                unit: p.unit,
                current_quantity: Array.isArray(p.stock) ? p.stock[0]?.quantity || 0 : 0,
                min_stock_level: p.min_stock_level
            }));

        // Get total products count using team_id
        const { count: totalProducts } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', membership.team_id);

        const summary: StockSummary = {
            total_products: totalProducts || 0,
            low_stock_count: lowStock.length,
            expiring_soon_count: 0,
            total_movements_today: 0
        };

        return { lowStock, summary };
    }
};
