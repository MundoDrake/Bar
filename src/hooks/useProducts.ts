import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useTeams } from './useTeamsHook'
import type { ProductWithStock, ProductFormData } from '../types/database'

interface UseProductsReturn {
    products: ProductWithStock[]
    loading: boolean
    error: string | null
    createProduct: (data: ProductFormData) => Promise<{ error: string | null }>
    updateProduct: (id: string, data: Partial<ProductFormData>) => Promise<{ error: string | null }>
    deleteProduct: (id: string) => Promise<{ error: string | null }>
    refreshProducts: () => Promise<void>
}

export function useProducts(): UseProductsReturn {
    const [products, setProducts] = useState<ProductWithStock[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { user } = useAuth()
    const { teams } = useTeams()

    // Get the team owner's user_id - products should be associated with the team owner
    // If user is a member, use the owner's ID. If user is the owner, use their own ID.
    const getTeamOwnerId = useCallback(() => {
        if (!user || teams.length === 0) return user?.id || null

        // Find a team where the current user is either the owner or a member
        // Priority: if user owns a team, use their ID. Otherwise, use the owner of the first team they're a member of.
        const ownedTeam = teams.find(t => t.owner_user_id === user.id)
        if (ownedTeam) {
            return user.id
        }

        // User is a member, use the team owner's ID
        return teams[0]?.owner_user_id || user.id
    }, [user, teams])

    const fetchProducts = useCallback(async () => {
        if (!user) return

        try {
            setLoading(true)
            setError(null)

            const { data, error: fetchError } = await supabase
                .from('products')
                .select(`
          *,
          stock (*)
        `)
                // RLS handles team access filtering
                .order('name')

            if (fetchError) throw fetchError

            setProducts(data || [])
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao carregar produtos'
            setError(message)
            console.error('Error fetching products:', err)
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        fetchProducts()
    }, [fetchProducts])

    const createProduct = async (data: ProductFormData) => {
        if (!user) return { error: 'Usuário não autenticado' }

        // Use team owner's ID so all team members can see the product
        const ownerId = getTeamOwnerId()
        if (!ownerId) return { error: 'Nenhum time encontrado' }

        try {
            const { data: newProduct, error: insertError } = await supabase
                .from('products')
                .insert({
                    user_id: ownerId, // Use team owner's ID, not current user's ID
                    name: data.name,
                    category: data.category,
                    unit: data.unit,
                    min_stock_level: data.min_stock_level || 0,
                    expiry_tracking: data.expiry_tracking || false,
                    notes: data.notes || null,
                })
                .select()
                .single()

            if (insertError) throw insertError

            // Create initial stock record with 0 quantity
            await supabase.from('stock').insert({
                product_id: newProduct.id,
                quantity: 0,
            })

            await fetchProducts()
            return { error: null }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao criar produto'
            return { error: message }
        }
    }

    const updateProduct = async (id: string, data: Partial<ProductFormData>) => {
        try {
            const { error: updateError } = await supabase
                .from('products')
                .update({
                    ...data,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id)

            if (updateError) throw updateError

            await fetchProducts()
            return { error: null }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao atualizar produto'
            return { error: message }
        }
    }

    const deleteProduct = async (id: string) => {
        try {
            const { error: deleteError } = await supabase
                .from('products')
                .delete()
                .eq('id', id)

            if (deleteError) throw deleteError

            await fetchProducts()
            return { error: null }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao excluir produto'
            return { error: message }
        }
    }

    return {
        products,
        loading,
        error,
        createProduct,
        updateProduct,
        deleteProduct,
        refreshProducts: fetchProducts,
    }
}
