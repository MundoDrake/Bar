import { useState, useMemo } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTeams } from '../../hooks/useTeams'
import { ROUTES } from '../../constants/routes'

// Define nav items with route keys for permission checking
const NAV_ITEMS = [
    { to: ROUTES.DASHBOARD, icon: '📊', label: 'Dashboard', routeKey: 'dashboard' },
    { to: ROUTES.PRODUCTS, icon: '📦', label: 'Produtos', routeKey: 'products' },
    { to: ROUTES.STOCK, icon: '🏷️', label: 'Estoque', routeKey: 'stock' },
    { to: ROUTES.MOVEMENTS, icon: '🔄', label: 'Movimentações', routeKey: 'movements' },
    { to: ROUTES.REPORTS, icon: '📋', label: 'Relatórios', routeKey: 'reports' },
    { to: ROUTES.TEAMS, icon: '👥', label: 'Time', routeKey: 'teams', ownerOnly: true },
    { to: ROUTES.AI_ASSISTANT, icon: '🤖', label: 'Assistente IA', routeKey: 'ai' },
    { to: ROUTES.SETTINGS, icon: '⚙️', label: 'Configurações', routeKey: 'settings', alwaysShow: true },
]

export function AppLayout() {
    const { user, signOut } = useAuth()
    const { isOwner, currentMember } = useTeams()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const closeSidebar = () => setSidebarOpen(false)

    // Filter nav items based on user permissions
    const visibleNavItems = useMemo(() => {
        return NAV_ITEMS.filter(item => {
            // Always show settings
            if (item.alwaysShow) return true

            // Owner sees everything
            if (isOwner) return true

            // Owner-only items hidden for members
            if (item.ownerOnly && !isOwner) return false

            // If no restrictions (null), show all
            if (!currentMember || currentMember.allowed_routes === null) return true

            // Check if route is in allowed list
            return currentMember.allowed_routes?.includes(item.routeKey) ?? false
        })
    }, [isOwner, currentMember])

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
                    {visibleNavItems.map((item) => (
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
