import { useState, FormEvent, useEffect } from 'react'
import type { ProductWithStock } from '../../types/database'
import { PRODUCT_UNITS } from '../../constants/products'

interface StockCheckItem {
    productId: string
    productName: string
    unit: string
    registeredQty: number
    countedQty: string
    error?: string
}

interface StockCheckFormProps {
    products: ProductWithStock[]
    onSubmit: (movements: { productId: string; quantity: number }[]) => Promise<{ error?: string }>
    onCancel: () => void
}

export function StockCheckForm({ products, onSubmit, onCancel }: StockCheckFormProps) {
    const [items, setItems] = useState<StockCheckItem[]>([])
    const [loading, setLoading] = useState(false)
    const [globalError, setGlobalError] = useState('')

    const getUnitLabel = (unit: string) => {
        return PRODUCT_UNITS.find(u => u.value === unit)?.label || unit
    }

    useEffect(() => {
        const initialItems: StockCheckItem[] = products.map(product => ({
            productId: product.id,
            productName: product.name,
            unit: product.unit,
            registeredQty: product.stock?.quantity ?? 0,
            countedQty: '',
            error: undefined,
        }))
        setItems(initialItems)
    }, [products])

    const updateItemQty = (productId: string, value: string) => {
        setItems(prev => prev.map(item => {
            if (item.productId === productId) {
                return { ...item, countedQty: value, error: undefined }
            }
            return item
        }))
        setGlobalError('')
    }

    const validateItems = (): boolean => {
        let hasError = false
        const updatedItems = items.map(item => {
            // Campo obrigatório
            if (item.countedQty === '') {
                hasError = true
                return { ...item, error: 'Campo obrigatório' }
            }

            const counted = Number(item.countedQty)

            if (isNaN(counted) || counted < 0) {
                hasError = true
                return { ...item, error: 'Valor inválido' }
            }

            // Não pode ter mais do que o registrado
            if (counted > item.registeredQty) {
                hasError = true
                return { ...item, error: `Máximo: ${item.registeredQty}` }
            }

            return { ...item, error: undefined }
        })

        setItems(updatedItems)
        return !hasError
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setGlobalError('')

        if (!validateItems()) {
            setGlobalError('Corrija os erros antes de continuar')
            return
        }

        // Calcular movimentações (apenas para itens com diferença)
        const movements: { productId: string; quantity: number }[] = []

        for (const item of items) {
            const counted = Number(item.countedQty)
            const diff = item.registeredQty - counted

            if (diff > 0) {
                movements.push({
                    productId: item.productId,
                    quantity: diff,
                })
            }
        }

        if (movements.length === 0) {
            setGlobalError('Nenhuma diferença encontrada no estoque')
            return
        }

        setLoading(true)
        const result = await onSubmit(movements)
        setLoading(false)

        if (result.error) {
            setGlobalError(result.error)
        }
    }

    const hasChanges = items.some(item => {
        const counted = Number(item.countedQty)
        return !isNaN(counted) && counted !== item.registeredQty
    })

    return (
        <form onSubmit={handleSubmit}>
            <div className="stock-check-list">
                <div className="stock-check-header">
                    <span className="stock-check-col-product">Produto</span>
                    <span className="stock-check-col-registered">Registrado</span>
                    <span className="stock-check-col-counted">Contagem</span>
                </div>

                {items.map(item => (
                    <div key={item.productId} className={`stock-check-row ${item.error ? 'has-error' : ''}`}>
                        <div className="stock-check-col-product">
                            <div>
                                <span className="stock-check-product-name">{item.productName}</span>
                                <span className="stock-check-product-unit">{getUnitLabel(item.unit)}</span>
                            </div>
                            <span className="stock-check-registered-mobile mono">
                                Estoque: {item.registeredQty}
                            </span>
                        </div>
                        <div className="stock-check-col-registered">
                            <span className="mono">{item.registeredQty}</span>
                        </div>
                        <div className="stock-check-col-counted">
                            <input
                                type="number"
                                className={`form-input stock-check-input ${item.error ? 'error' : ''}`}
                                value={item.countedQty}
                                onChange={(e) => updateItemQty(item.productId, e.target.value)}
                                placeholder="0"
                                min="0"
                                max={item.registeredQty}
                                step="1"
                                required
                                aria-label={`Contagem de ${item.productName}`}
                            />
                            {item.error && (
                                <span className="stock-check-error">{item.error}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {globalError && (
                <div className="alert alert-error" style={{ marginTop: 'var(--spacing-3)' }}>
                    {globalError}
                </div>
            )}

            <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={onCancel}>
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || !hasChanges}
                >
                    {loading ? 'Salvando...' : 'Confirmar Conferência'}
                </button>
            </div>
        </form>
    )
}
