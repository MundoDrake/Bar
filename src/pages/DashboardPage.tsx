import { useAlerts } from '../hooks/useStock'
import { useAuth } from '../contexts/AuthContext'

export function DashboardPage() {
    const { user, signOut } = useAuth()
    const { summary, lowStockProducts, loading } = useAlerts()

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Visão geral do seu estoque</p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={signOut}>
                    Sair
                </button>
            </div>

            {/* Stats Grid */}
            <div className="dashboard-grid">
                <div className="stat-card">
                    <div className="stat-icon primary">📦</div>
                    <div className="stat-info">
                        <div className="stat-value">
                            {loading ? '-' : summary?.total_products ?? 0}
                        </div>
                        <div className="stat-label">Total de Produtos</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon warning">⚠️</div>
                    <div className="stat-info">
                        <div className="stat-value">
                            {loading ? '-' : summary?.low_stock_count ?? 0}
                        </div>
                        <div className="stat-label">Estoque Baixo</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon error">📅</div>
                    <div className="stat-info">
                        <div className="stat-value">
                            {loading ? '-' : summary?.expiring_soon_count ?? 0}
                        </div>
                        <div className="stat-label">Vencendo em 7 dias</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon success">🔄</div>
                    <div className="stat-info">
                        <div className="stat-value">
                            {loading ? '-' : summary?.total_movements_today ?? 0}
                        </div>
                        <div className="stat-label">Movimentações Hoje</div>
                    </div>
                </div>
            </div>

            {/* Alerts Section */}
            {lowStockProducts.length > 0 && (
                <div className="dashboard-section">
                    <h2 className="section-title">⚠️ Produtos com Estoque Baixo</h2>
                    <div className="alert-list">
                        {lowStockProducts.slice(0, 5).map((product) => (
                            <div key={product.product_id} className="alert-item">
                                <div className="alert-item-info">
                                    <span className="alert-item-name">{product.product_name}</span>
                                    <span className="alert-item-category">{product.category}</span>
                                </div>
                                <div className="alert-item-stock">
                                    <span className="current-stock">{product.current_quantity}</span>
                                    <span className="stock-separator">/</span>
                                    <span className="min-stock">{product.min_stock_level}</span>
                                    <span className="stock-unit">{product.unit}</span>
                                </div>
                            </div>
                        ))}
                        {lowStockProducts.length > 5 && (
                            <p className="alert-more">
                                + {lowStockProducts.length - 5} outros produtos
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Welcome Message */}
            {!loading && summary?.total_products === 0 && (
                <div className="welcome-card">
                    <div className="welcome-icon">👋</div>
                    <h2>Bem-vindo ao Bar Stock Manager!</h2>
                    <p>
                        Olá, <strong>{user?.email}</strong>! Comece cadastrando seus produtos
                        para gerenciar seu estoque de forma inteligente.
                    </p>
                    <a href="/products" className="btn btn-primary">
                        Cadastrar Produtos
                    </a>
                </div>
            )}
        </div>
    )
}
