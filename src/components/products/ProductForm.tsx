import { useState, FormEvent } from 'react'
import type { ProductFormData } from '../../types/database'
import { PRODUCT_CATEGORIES, PRODUCT_UNITS } from '../../constants/products'

interface ProductFormProps {
    initialData?: Partial<ProductFormData>
    onSubmit: (data: ProductFormData) => Promise<{ error: string | null }>
    onCancel: () => void
    submitLabel?: string
}

export function ProductForm({
    initialData,
    onSubmit,
    onCancel,
    submitLabel = 'Salvar'
}: ProductFormProps) {
    const [formData, setFormData] = useState<ProductFormData>({
        name: initialData?.name || '',
        category: initialData?.category || '',
        unit: initialData?.unit || '',
        min_stock_level: initialData?.min_stock_level || 0,
        expiry_tracking: initialData?.expiry_tracking || false,
        notes: initialData?.notes || '',
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const result = await onSubmit(formData)
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
        <form className="product-form" onSubmit={handleSubmit}>
            {error && (
                <div className="alert alert-error">
                    {error}
                </div>
            )}

            <div className="form-group">
                <label htmlFor="name" className="form-label">Nome do Produto *</label>
                <input
                    type="text"
                    id="name"
                    className="form-input"
                    placeholder="Ex: Vodka Absolut 1L"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                />
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="category" className="form-label">Categoria *</label>
                    <select
                        id="category"
                        className="form-select"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        required
                    >
                        <option value="">Selecione...</option>
                        {PRODUCT_CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                                {cat.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="unit" className="form-label">Unidade *</label>
                    <select
                        id="unit"
                        className="form-select"
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        required
                    >
                        <option value="">Selecione...</option>
                        {PRODUCT_UNITS.map((unit) => (
                            <option key={unit.value} value={unit.value}>
                                {unit.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="min_stock_level" className="form-label">Estoque Mínimo</label>
                    <input
                        type="number"
                        id="min_stock_level"
                        className="form-input"
                        placeholder="0"
                        min="0"
                        step="0.01"
                        value={formData.min_stock_level}
                        onChange={(e) => setFormData({ ...formData, min_stock_level: parseFloat(e.target.value) || 0 })}
                    />
                    <span className="form-hint">Alerta quando atingir este nível</span>
                </div>

                <div className="form-group">
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={formData.expiry_tracking}
                            onChange={(e) => setFormData({ ...formData, expiry_tracking: e.target.checked })}
                        />
                        <span>Controlar validade</span>
                    </label>
                </div>
            </div>

            <div className="form-group">
                <label htmlFor="notes" className="form-label">Observações</label>
                <textarea
                    id="notes"
                    className="form-textarea"
                    placeholder="Notas adicionais sobre o produto..."
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                    className="btn btn-primary"
                    disabled={loading}
                >
                    {loading ? 'Salvando...' : submitLabel}
                </button>
            </div>
        </form>
    )
}
