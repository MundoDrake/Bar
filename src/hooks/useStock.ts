import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { stockServices } from '../services/stockService'
import { productServices } from '../services/productService'
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
            const data = await productServices.getAll()
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
            await stockServices.registerMovement(data)
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
            const data = await stockServices.getMovements()
            // Client-side filter if productId is provided (since API returns all)
            // Or we could update API to accept filter. Ideally API updates.
            // For now, simple filter:
            const filtered = productId ? data.filter(m => m.product_id === productId) : data
            setMovements(filtered || [])
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
            const data = await stockServices.getAlerts()
            setLowStockProducts(data.lowStock || [])
            setSummary(data.summary || null)
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
