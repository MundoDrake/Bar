import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type {
    ProductWithStock,
    StockMovement,
    StockMovementFormData,
    LowStockProduct,
    StockSummary
} from '../types/database'

interface UseStockReturn {
    stockItems: ProductWithStock[]
    loading: boolean
    error: string | null
    registerMovement: (data: StockMovementFormData) => Promise<{ error: string | null }>
    refreshStock: () => Promise<void>
}

export function useStock(): UseStockReturn {
    const [stockItems, setStockItems] = useState<ProductWithStock[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { user } = useAuth()

    const fetchStock = useCallback(async () => {
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

            setStockItems(data || [])
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao carregar estoque'
            setError(message)
            console.error('Error fetching stock:', err)
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        fetchStock()
    }, [fetchStock])

    const registerMovement = async (data: StockMovementFormData) => {
        try {
            const { error: rpcError } = await supabase.rpc('register_stock_movement', {
                p_product_id: data.product_id,
                p_type: data.type,
                p_quantity: data.quantity,
                p_reason: data.reason || null,
                p_expiry_date: data.expiry_date || null,
                p_notes: data.notes || null,
            })

            if (rpcError) throw rpcError

            await fetchStock()
            return { error: null }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao registrar movimentação'
            return { error: message }
        }
    }

    return {
        stockItems,
        loading,
        error,
        registerMovement,
        refreshStock: fetchStock,
    }
}

// Hook for movement history
interface UseMovementsReturn {
    movements: (StockMovement & { product: { name: string } })[]
    loading: boolean
    error: string | null
    refreshMovements: () => Promise<void>
}

export function useMovements(productId?: string): UseMovementsReturn {
    const [movements, setMovements] = useState<(StockMovement & { product: { name: string } })[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { user } = useAuth()

    const fetchMovements = useCallback(async () => {
        if (!user) return

        try {
            setLoading(true)
            setError(null)

            let query = supabase
                .from('stock_movements')
                .select(`
          *,
          product:products!inner (name, user_id)
        `)
                .order('created_at', { ascending: false })
                .limit(100)

            if (productId) {
                query = query.eq('product_id', productId)
            }

            const { data, error: fetchError } = await query

            if (fetchError) throw fetchError

            // Filter by user_id (RLS should handle this, but double-check)
            const filteredData = (data || []).filter(
                (m) => (m.product as unknown as { user_id: string }).user_id === user.id
            )

            setMovements(filteredData)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao carregar movimentações'
            setError(message)
            console.error('Error fetching movements:', err)
        } finally {
            setLoading(false)
        }
    }, [user, productId])

    useEffect(() => {
        fetchMovements()
    }, [fetchMovements])

    return {
        movements,
        loading,
        error,
        refreshMovements: fetchMovements,
    }
}

// Hook for alerts (low stock + expiring)
interface UseAlertsReturn {
    lowStockProducts: LowStockProduct[]
    summary: StockSummary | null
    loading: boolean
    error: string | null
    refreshAlerts: () => Promise<void>
}

export function useAlerts(): UseAlertsReturn {
    const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([])
    const [summary, setSummary] = useState<StockSummary | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { user } = useAuth()

    const fetchAlerts = useCallback(async () => {
        if (!user) return

        try {
            setLoading(true)
            setError(null)

            // Fetch low stock products
            const { data: lowStock, error: lowStockError } = await supabase.rpc(
                'get_low_stock_products',
                { p_user_id: user.id }
            )

            if (lowStockError) throw lowStockError

            // Fetch summary
            const { data: summaryData, error: summaryError } = await supabase.rpc(
                'get_stock_summary',
                { p_user_id: user.id }
            )

            if (summaryError) throw summaryError

            setLowStockProducts(lowStock || [])
            setSummary(summaryData?.[0] || null)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao carregar alertas'
            setError(message)
            console.error('Error fetching alerts:', err)
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        fetchAlerts()
    }, [fetchAlerts])

    return {
        lowStockProducts,
        summary,
        loading,
        error,
        refreshAlerts: fetchAlerts,
    }
}
