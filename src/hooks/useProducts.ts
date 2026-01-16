import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { productServices } from '../services/productService'
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
            const data = await productServices.getAll()
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
            await productServices.create(data)
            await fetchProducts()
            return { error: null }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao criar produto'
            return { error: message }
        }
    }

    const updateProduct = async (id: string, data: Partial<ProductFormData>) => {
        try {
            await productServices.update(id, data)
            await fetchProducts()
            return { error: null }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao atualizar produto'
            return { error: message }
        }
    }

    const deleteProduct = async (id: string) => {
        try {
            await productServices.delete(id)
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
