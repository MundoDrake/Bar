import { useState } from 'react'
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
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const closeSidebar = () => setSidebarOpen(false)

    return (
        <div className="app-layout">
            {/* Mobile Header */}
            <header className="mobile-header">
                <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
                    ☰
                </button>
                <div className="mobile-logo">
                    <span>🍺</span>
                    <span>Bar Stock</span>
                </div>
                <div style={{ width: 40 }}></div>
            </header>

            {/* Sidebar Overlay */}
            <div
                className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
                onClick={closeSidebar}
            />

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
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
                            onClick={closeSidebar}
                        >
                            <span className="nav-item-icon">{item.icon}</span>
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-email">
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
