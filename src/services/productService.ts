// src/services/productService.ts
import { supabase } from '../lib/supabase';
import type { ProductWithStock, ProductFormData } from '../types/database';

export const productServices = {
    /**
     * Get all products with their stock levels for the current user's team.
     * Since Supabase schema uses user_id (not team_id), we get products from all team members.
     */
    getAll: async (): Promise<ProductWithStock[]> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Get all team members' user IDs for the user's team
        const { data: membership } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', user.id)
            .limit(1)
            .single();

        if (!membership) {
            // User has no team - just return their own products
            const { data, error } = await supabase
                .from('products')
                .select(`*, stock (*)`)
                .eq('user_id', user.id)
                .order('name');

            if (error) throw new Error(error.message);
            return (data || []).map(p => ({
                ...p,
                stock: Array.isArray(p.stock) ? p.stock[0] || null : p.stock
            }));
        }

        // Get all user IDs in the team
        const { data: teamMembers } = await supabase
            .from('team_members')
            .select('user_id')
            .eq('team_id', membership.team_id);

        const teamUserIds = teamMembers?.map(m => m.user_id) || [user.id];

        // Get products for all team members
        const { data, error } = await supabase
            .from('products')
            .select(`*, stock (*)`)
            .in('user_id', teamUserIds)
            .order('name');

        if (error) {
            console.error('[productService] Error fetching products:', error);
            throw new Error(error.message);
        }

        return (data || []).map(p => ({
            ...p,
            stock: Array.isArray(p.stock) ? p.stock[0] || null : p.stock
        }));
    },

    /**
     * Create a new product with initial stock entry
     */
    create: async (formData: ProductFormData): Promise<{ success: true; id: string }> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Insert product (user_id is the creator, team shares via team_members)
        const { data: product, error: productError } = await supabase
            .from('products')
            .insert({
                user_id: user.id,
                name: formData.name,
                category: formData.category,
                unit: formData.unit,
                min_stock_level: formData.min_stock_level || 0,
                expiry_tracking: formData.expiry_tracking || false,
                notes: formData.notes || null
            })
            .select('id')
            .single();

        if (productError) {
            console.error('[productService] Error creating product:', productError);
            throw new Error(productError.message);
        }

        // Initialize stock entry
        const { error: stockError } = await supabase
            .from('stock')
            .insert({
                product_id: product.id,
                quantity: 0
            });

        if (stockError) {
            console.error('[productService] Error creating stock entry:', stockError);
        }

        return { success: true, id: product.id };
    },

    /**
     * Update an existing product
     */
    update: async (id: string, data: Partial<ProductFormData>): Promise<{ success: true }> => {
        const { error } = await supabase
            .from('products')
            .update({
                name: data.name,
                category: data.category,
                unit: data.unit,
                min_stock_level: data.min_stock_level,
                expiry_tracking: data.expiry_tracking,
                notes: data.notes,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) {
            console.error('[productService] Error updating product:', error);
            throw new Error(error.message);
        }

        return { success: true };
    },

    /**
     * Delete a product (cascades to stock and movements)
     */
    delete: async (id: string): Promise<{ success: true }> => {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[productService] Error deleting product:', error);
            throw new Error(error.message);
        }

        return { success: true };
    }
};
