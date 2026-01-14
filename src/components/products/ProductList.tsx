import { useState } from 'react'
import type { ProductWithStock } from '../../types/database'
import { ProductCard } from './ProductCard'
import { PRODUCT_CATEGORIES } from '../../constants/products'

interface ProductListProps {
    products: ProductWithStock[]
    loading: boolean
    onEdit: (product: ProductWithStock) => void
    onDelete: (product: ProductWithStock) => void
}

export function ProductList({ products, loading, onEdit, onDelete }: ProductListProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')

    const filteredProducts = products.filter((product) => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = !categoryFilter || product.category === categoryFilter
        return matchesSearch && matchesCategory
    })

    if (loading) {
        return (
            <div className="product-list-loading">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="skeleton product-card-skeleton" />
                ))}
            </div>
        )
    }

    return (
        <div className="product-list-container">
            <div className="product-list-filters">
                <div className="search-input-wrapper">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        className="form-input search-input"
                        placeholder="Buscar produto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <select
                    className="form-select category-filter"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                >
                    <option value="">Todas as categorias</option>
                    {PRODUCT_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                            {cat.label}
                        </option>
                    ))}
                </select>
            </div>

            {filteredProducts.length === 0 ? (
                <div className="product-list-empty">
                    {products.length === 0 ? (
                        <>
                            <span className="empty-icon">📦</span>
                            <h3>Nenhum produto cadastrado</h3>
                            <p>Comece adicionando seu primeiro produto ao estoque.</p>
                        </>
                    ) : (
                        <>
                            <span className="empty-icon">🔍</span>
                            <h3>Nenhum resultado encontrado</h3>
                            <p>Tente ajustar os filtros de busca.</p>
                        </>
                    )}
                </div>
            ) : (
                <div className="product-grid">
                    {filteredProducts.map((product) => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
