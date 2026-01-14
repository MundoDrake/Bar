import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
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
                .eq('user_id', user.id)
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

        try {
            const { data: newProduct, error: insertError } = await supabase
                .from('products')
                .insert({
                    user_id: user.id,
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
