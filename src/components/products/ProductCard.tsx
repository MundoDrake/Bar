import type { ProductWithStock } from '../../types/database'
import { PRODUCT_CATEGORIES, PRODUCT_UNITS } from '../../constants/products'

interface ProductCardProps {
    product: ProductWithStock
    onEdit: (product: ProductWithStock) => void
    onDelete: (product: ProductWithStock) => void
}

export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
    const currentStock = product.stock?.quantity ?? 0
    const isLowStock = product.min_stock_level > 0 && currentStock <= product.min_stock_level

    const categoryLabel = PRODUCT_CATEGORIES.find(c => c.value === product.category)?.label || product.category
    const unitLabel = PRODUCT_UNITS.find(u => u.value === product.unit)?.label || product.unit

    return (
        <div className={`product-card ${isLowStock ? 'low-stock' : ''}`}>
            <div className="product-card-header">
                <h3 className="product-card-title">{product.name}</h3>
                {isLowStock && (
                    <span className="badge badge-warning">Estoque Baixo</span>
                )}
            </div>

            <div className="product-card-info">
                <div className="product-card-row">
                    <span className="product-card-label">Categoria:</span>
                    <span className="product-card-value">{categoryLabel}</span>
                </div>
                <div className="product-card-row">
                    <span className="product-card-label">Estoque:</span>
                    <span className={`product-card-value ${isLowStock ? 'text-warning' : ''}`}>
                        {currentStock} {unitLabel}
                    </span>
                </div>
                {product.min_stock_level > 0 && (
                    <div className="product-card-row">
                        <span className="product-card-label">Mínimo:</span>
                        <span className="product-card-value">{product.min_stock_level} {unitLabel}</span>
                    </div>
                )}
            </div>

            <div className="product-card-actions">
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => onEdit(product)}
                    title="Editar produto"
                >
                    ✏️ Editar
                </button>
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => onDelete(product)}
                    title="Excluir produto"
                >
                    🗑️ Excluir
                </button>
            </div>
        </div>
    )
}
