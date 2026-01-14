import { useState, FormEvent } from 'react'
import type { ProductWithStock, MovementType } from '../../types/database'
import { MOVEMENT_REASONS, PRODUCT_UNITS } from '../../constants/products'

interface StockMovementFormProps {
    products: ProductWithStock[]
    type: 'entrada' | 'saida'
    onSubmit: (data: {
        product_id: string
        type: MovementType
        quantity: number
        reason?: string
        expiry_date?: string
        notes?: string
    }) => Promise<{ error: string | null }>
    onCancel: () => void
}

export function StockMovementForm({
    products,
    type,
    onSubmit,
    onCancel
}: StockMovementFormProps) {
    const [productId, setProductId] = useState('')
    const [quantity, setQuantity] = useState('')
    const [reason, setReason] = useState('')
    const [expiryDate, setExpiryDate] = useState('')
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const selectedProduct = products.find(p => p.id === productId)
    const currentStock = selectedProduct?.stock?.quantity ?? 0
    const unitLabel = selectedProduct
        ? PRODUCT_UNITS.find(u => u.value === selectedProduct.unit)?.label || selectedProduct.unit
        : ''

    const reasons = MOVEMENT_REASONS[type] || []

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')

        const qty = parseFloat(quantity)
        if (isNaN(qty) || qty <= 0) {
            setError('Quantidade deve ser maior que zero')
            return
        }

        if (type === 'saida' && qty > currentStock) {
            setError(`Estoque insuficiente. Disponível: ${currentStock} ${unitLabel}`)
            return
        }

        setLoading(true)

        try {
            const result = await onSubmit({
                product_id: productId,
                type: type as MovementType,
                quantity: qty,
                reason: reason || undefined,
                expiry_date: expiryDate || undefined,
                notes: notes || undefined,
            })

            if (result.error) {
                setError(result.error)
            }
        } catch {
            setError('Ocorreu um erro inesperado')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form className="stock-movement-form" onSubmit={handleSubmit}>
            {error && (
                <div className="alert alert-error">
                    {error}
                </div>
            )}

            <div className="form-group">
                <label htmlFor="product" className="form-label">Produto *</label>
                <select
                    id="product"
                    className="form-select"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    required
                >
                    <option value="">Selecione um produto...</option>
                    {products.map((product) => (
                        <option key={product.id} value={product.id}>
                            {product.name} ({product.stock?.quantity ?? 0} {PRODUCT_UNITS.find(u => u.value === product.unit)?.label || product.unit})
                        </option>
                    ))}
                </select>
            </div>

            {selectedProduct && type === 'saida' && (
                <div className="stock-info-banner">
                    <span className="stock-info-label">Estoque atual:</span>
                    <span className="stock-info-value">{currentStock} {unitLabel}</span>
                </div>
            )}

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="quantity" className="form-label">Quantidade *</label>
                    <input
                        type="number"
                        id="quantity"
                        className="form-input"
                        placeholder="0"
                        min="0.01"
                        step="0.01"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        required
                    />
                    {unitLabel && <span className="form-hint">{unitLabel}</span>}
                </div>

                <div className="form-group">
                    <label htmlFor="reason" className="form-label">Motivo</label>
                    <select
                        id="reason"
                        className="form-select"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    >
                        <option value="">Selecione...</option>
                        {reasons.map((r) => (
                            <option key={r.value} value={r.value}>
                                {r.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {type === 'entrada' && selectedProduct?.expiry_tracking && (
                <div className="form-group">
                    <label htmlFor="expiryDate" className="form-label">Data de Validade</label>
                    <input
                        type="date"
                        id="expiryDate"
                        className="form-input"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                    />
                </div>
            )}

            <div className="form-group">
                <label htmlFor="notes" className="form-label">Observações</label>
                <textarea
                    id="notes"
                    className="form-textarea"
                    placeholder="Notas adicionais..."
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />
            </div>

            <div className="form-actions">
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onCancel}
                    disabled={loading}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className={`btn ${type === 'entrada' ? 'btn-primary' : 'btn-danger'}`}
                    disabled={loading || !productId}
                >
                    {loading ? 'Registrando...' : type === 'entrada' ? '➕ Registrar Entrada' : '➖ Registrar Saída'}
                </button>
            </div>
        </form>
    )
}
