import { useState } from 'react'
import { useMovements, useStock } from '../hooks/useStock'
import { useProducts } from '../hooks/useProducts'
import { StockMovementForm } from '../components/stock/StockMovementForm'
import { Modal } from '../components/ui/Modal'

export function MovementsPage() {
    const { movements, loading, error, refreshMovements } = useMovements()
    const { registerMovement } = useStock()
    const { products } = useProducts()

    const [showLossModal, setShowLossModal] = useState(false)

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            entrada: '➕ Entrada',
            saida: '➖ Saída',
            perda: '⚠️ Perda',
            ajuste: '🔧 Ajuste',
        }
        return labels[type] || type
    }

    const getTypeBadgeClass = (type: string) => {
        const classes: Record<string, string> = {
            entrada: 'badge-success',
            saida: 'badge-primary',
            perda: 'badge-error',
            ajuste: 'badge-warning',
        }
        return classes[type] || ''
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const handleLoss = async (data: Parameters<typeof registerMovement>[0]) => {
        const result = await registerMovement({ ...data, type: 'perda' })
        if (!result.error) {
            setShowLossModal(false)
            refreshMovements()
        }
        return result
    }

    if (loading) {
        return (
            <div className="page-container">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Movimentações</h1>
                        <p className="page-subtitle">Histórico de entradas e saídas</p>
                    </div>
                </div>
                <div className="movements-loading">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="skeleton movement-row-skeleton" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Movimentações</h1>
                    <p className="page-subtitle">Histórico de entradas e saídas</p>
                </div>
                <button
                    className="btn btn-secondary"
                    onClick={() => setShowLossModal(true)}
                >
                    Registrar Movimentação
                </button>
            </div>

            {error && (
                <div className="alert alert-error">
                    {error}
                </div>
            )}

            {movements.length === 0 ? (
                <div className="product-list-empty">
                    <span className="empty-icon">🔄</span>
                    <h3>Nenhuma movimentação registrada</h3>
                    <p>As movimentações de estoque aparecerão aqui.</p>
                </div>
            ) : (
                <div className="movements-list">
                    {movements.map((movement) => (
                        <div key={movement.id} className="movement-card">
                            <div className="movement-header">
                                <span className={`badge ${getTypeBadgeClass(movement.type)}`}>
                                    {getTypeLabel(movement.type)}
                                </span>
                                <span className="movement-date">{formatDate(movement.created_at)}</span>
                            </div>
                            <div className="movement-body">
                                <div className="movement-product">{movement.product.name}</div>
                                <div className="movement-quantity">
                                    {movement.type === 'entrada' ? '+' : '-'}{movement.quantity}
                                </div>
                            </div>
                            {movement.reason && (
                                <div className="movement-reason">
                                    Motivo: {movement.reason}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Loss Modal */}
            <Modal
                isOpen={showLossModal}
                onClose={() => setShowLossModal(false)}
                title="Registrar Perda"
                size="md"
            >
                <StockMovementForm
                    products={products}
                    type="saida"
                    onSubmit={handleLoss}
                    onCancel={() => setShowLossModal(false)}
                />
            </Modal>
        </div>
    )
}
