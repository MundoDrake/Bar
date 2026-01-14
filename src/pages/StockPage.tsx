import { useState } from 'react'
import { useStock } from '../hooks/useStock'
import { useProducts } from '../hooks/useProducts'
import { StockMovementForm } from '../components/stock/StockMovementForm'
import { Modal } from '../components/ui/Modal'
import { PRODUCT_UNITS } from '../constants/products'

export function StockPage() {
    const { stockItems, loading, error, registerMovement, refreshStock } = useStock()
    const { products } = useProducts()

    const [showEntryModal, setShowEntryModal] = useState(false)

    const getUnitLabel = (unit: string) => {
        return PRODUCT_UNITS.find(u => u.value === unit)?.label || unit
    }

    const handleMovement = async (data: Parameters<typeof registerMovement>[0]) => {
        const result = await registerMovement(data)
        if (!result.error) {
            setShowEntryModal(false)
            refreshStock()
        }
        return result
    }

    if (loading) {
        return (
            <div className="page-container">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Estoque Atual</h1>
                        <p className="page-subtitle">Visualize e gerencie seu estoque</p>
                    </div>
                </div>
                <div className="stock-loading">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="skeleton stock-row-skeleton" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Estoque Atual</h1>
                    <p className="page-subtitle">Visualize e gerencie seu estoque</p>
                </div>
                <div className="header-actions">
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowEntryModal(true)}
                    >
                        ➕ Entrada
                    </button>
                </div>
            </div>

            {error && (
                <div className="alert alert-error">
                    {error}
                </div>
            )}

            {stockItems.length === 0 ? (
                <div className="product-list-empty">
                    <span className="empty-icon">📦</span>
                    <h3>Nenhum produto cadastrado</h3>
                    <p>Cadastre produtos para visualizar o estoque.</p>
                </div>
            ) : (
                <>
                    {/* Desktop: Tabela */}
                    <div className="stock-table-container stock-desktop">
                        <table className="stock-table">
                            <thead>
                                <tr>
                                    <th>Produto</th>
                                    <th>Categoria</th>
                                    <th>Quantidade</th>
                                    <th>Mínimo</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stockItems.map((item) => {
                                    const currentQty = item.stock?.quantity ?? 0
                                    const isLow = item.min_stock_level > 0 && currentQty <= item.min_stock_level

                                    return (
                                        <tr key={item.id} className={isLow ? 'low-stock-row' : ''}>
                                            <td className="stock-product-name">{item.name}</td>
                                            <td>{item.category}</td>
                                            <td>
                                                <span className={`mono ${isLow ? 'text-warning' : ''}`}>
                                                    {currentQty} {getUnitLabel(item.unit)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="mono">
                                                    {item.min_stock_level > 0
                                                        ? `${item.min_stock_level} ${getUnitLabel(item.unit)}`
                                                        : '-'
                                                    }
                                                </span>
                                            </td>
                                            <td>
                                                {isLow ? (
                                                    <span className="badge badge-warning">Baixo</span>
                                                ) : (
                                                    <span className="badge badge-success">OK</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile: Cards */}
                    <div className="stock-cards stock-mobile">
                        {stockItems.map((item) => {
                            const currentQty = item.stock?.quantity ?? 0
                            const isLow = item.min_stock_level > 0 && currentQty <= item.min_stock_level

                            return (
                                <div key={item.id} className={`stock-card ${isLow ? 'low-stock' : ''}`}>
                                    <div className="stock-card-header">
                                        <span className="stock-card-name">{item.name}</span>
                                        {isLow ? (
                                            <span className="badge badge-warning">Baixo</span>
                                        ) : (
                                            <span className="badge badge-success">OK</span>
                                        )}
                                    </div>
                                    <div className="stock-card-category">{item.category}</div>
                                    <div className="stock-card-qty">
                                        <div className="stock-card-qty-item">
                                            <span className="stock-card-label">Atual</span>
                                            <span className={`mono stock-card-value ${isLow ? 'text-warning' : ''}`}>
                                                {currentQty} {getUnitLabel(item.unit)}
                                            </span>
                                        </div>
                                        {item.min_stock_level > 0 && (
                                            <div className="stock-card-qty-item">
                                                <span className="stock-card-label">Mínimo</span>
                                                <span className="mono stock-card-value">
                                                    {item.min_stock_level} {getUnitLabel(item.unit)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </>
            )}

            {/* Entry Modal */}
            <Modal
                isOpen={showEntryModal}
                onClose={() => setShowEntryModal(false)}
                title="Registrar Entrada"
                size="md"
            >
                <StockMovementForm
                    products={products}
                    type="entrada"
                    onSubmit={handleMovement}
                    onCancel={() => setShowEntryModal(false)}
                />
            </Modal>
        </div>
    )
}
