import { Navigate } from 'react-router-dom'
import { useTeams } from '../hooks/useTeamsHook'
import { ROUTES } from '../constants/routes'

interface WelcomeGuardProps {
    children: React.ReactNode
}

/**
 * Guard component that redirects users who already have a team/dashboard
 * to the dashboard page instead of showing the Welcome page.
 */
export function WelcomeGuard({ children }: WelcomeGuardProps) {
    const { teams, loading } = useTeams()

    // Show loading spinner while checking team status
    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner" />
                <p>Verificando...</p>
            </div>
        )
    }

    // If user has teams, redirect to dashboard immediately
    if (teams.length > 0) {
        return <Navigate to={ROUTES.DASHBOARD} replace />
    }

    // User has no teams, show the Welcome page
    return <>{children}</>
}
