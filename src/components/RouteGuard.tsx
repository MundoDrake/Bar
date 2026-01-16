// src/components/RouteGuard.tsx
import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTeams } from '../hooks/useTeamsHook';
import { ROUTES } from '../constants/routes';

interface RouteGuardProps {
    children: ReactNode;
}

/**
 * RouteGuard checks if the current user has permission to access the current route.
 * - Owners always have full access.
 * - Members with `allowed_routes: null` have full access.
 * - Members with `allowed_routes: ['/dashboard', '/products']` can only access those routes.
 */
export function RouteGuard({ children }: RouteGuardProps) {
    const { currentMember, loading, isOwner } = useTeams();
    const location = useLocation();

    // While loading, don't render anything (or show a loading indicator)
    if (loading) {
        return (
            <div className="page-container flex items-center justify-center">
                <div className="loading-spinner">Carregando...</div>
            </div>
        );
    }

    // If no currentMember yet (shouldn't happen if user is authenticated and has a team)
    if (!currentMember) {
        return <Navigate to={ROUTES.WELCOME} replace />;
    }

    // Owners always have full access
    if (isOwner) {
        return <>{children}</>;
    }

    // If allowed_routes is null, grant full access
    if (currentMember.allowed_routes === null) {
        return <>{children}</>;
    }

    // Check if current path is in allowed_routes
    const currentPath = location.pathname;
    const isAllowed = currentMember.allowed_routes.some(route =>
        currentPath === route || currentPath.startsWith(route + '/')
    );

    if (!isAllowed) {
        // Redirect to dashboard if not allowed (or show access denied)
        return (
            <div className="page-container">
                <div className="alert alert-error">
                    <h2>🚫 Acesso Restrito</h2>
                    <p>Você não tem permissão para acessar esta página.</p>
                    <p>Entre em contato com o dono do time para solicitar acesso.</p>
                    <a href={ROUTES.DASHBOARD} className="btn btn-primary mt-4">
                        Voltar ao Dashboard
                    </a>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
