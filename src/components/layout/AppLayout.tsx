import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const NAV_ITEMS = [
    { to: '/dashboard', icon: '📊', label: 'Dashboard' },
    { to: '/products', icon: '📦', label: 'Produtos' },
    { to: '/stock', icon: '🏷️', label: 'Estoque' },
    { to: '/movements', icon: '🔄', label: 'Movimentações' },
    { to: '/reports', icon: '📋', label: 'Relatórios' },
    { to: '/ai', icon: '🤖', label: 'Assistente IA' },
    { to: '/settings', icon: '⚙️', label: 'Configurações' },
]

export function AppLayout() {
    const { user, signOut } = useAuth()

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <span className="sidebar-logo-icon">🍺</span>
                        <span className="sidebar-logo-text">Bar Stock</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {NAV_ITEMS.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        >
                            <span className="nav-item-icon">{item.icon}</span>
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info" style={{ marginBottom: 'var(--spacing-3)', fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-400)' }}>
                        {user?.email}
                    </div>
                    <button className="btn btn-secondary w-full" onClick={signOut}>
                        Sair
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    )
}
