import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function PrivateRoute() {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner" />
                <p>Carregando...</p>
            </div>
        )
    }

    return user ? <Outlet /> : <Navigate to="/login" replace />
}
