import { Navigate } from 'react-router-dom'
import { useTeams } from '../hooks/useTeamsHook'
import { useAuth } from '../contexts/AuthContext'
import { ROUTES } from '../constants/routes'
import { setActiveTeamId, getActiveTeamId } from '../lib/api'

interface WelcomeGuardProps {
    children: React.ReactNode
}

/**
 * Guard component that redirects users who already have a team/dashboard
 * to the dashboard page instead of showing the Welcome page.
 * Also ensures the active team is set for API requests.
 */
export function WelcomeGuard({ children }: WelcomeGuardProps) {
    const { teams, loading } = useTeams()
    const { user } = useAuth()

    // Show loading spinner while checking team status
    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner" />
                <p>Verificando...</p>
            </div>
        )
    }

    // If user has teams, set active team and redirect to dashboard
    if (teams.length > 0) {
        // Check if there's already an active team set that's still valid
        const currentActiveTeamId = getActiveTeamId()
        const isCurrentTeamValid = currentActiveTeamId && teams.some(t => t.id === currentActiveTeamId)

        if (!isCurrentTeamValid) {
            // Set active team: prioritize joined teams (where user is NOT owner) for member experience
            const joinedTeam = teams.find(t => t.owner_user_id !== user?.id)
            const teamToActivate = joinedTeam || teams[0]
            setActiveTeamId(teamToActivate.id)
        }

        return <Navigate to={ROUTES.DASHBOARD} replace />
    }

    // User has no teams, show the Welcome page
    return <>{children}</>
}
