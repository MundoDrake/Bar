import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTeams } from '../hooks/useTeamsHook'
import { ROUTES } from '../constants/routes'

export function RootRedirect() {
    const { loading: authLoading } = useAuth()
    const { teams, loading: teamsLoading } = useTeams()

    if (authLoading || teamsLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    // If user has teams, they are an existing user -> Dashboard
    if (teams.length > 0) {
        return <Navigate to={ROUTES.DASHBOARD} replace />
    }

    // If no teams, they are a new user -> Welcome/Onboarding
    return <Navigate to={ROUTES.WELCOME} replace />
}
