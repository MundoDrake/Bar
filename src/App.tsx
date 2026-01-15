import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { PrivateRoute } from './components/PrivateRoute'
import { AppLayout } from './components/layout/AppLayout'

// Pages - Auth
import { LoginPage } from './pages/auth/LoginPage'
import { SignUpPage } from './pages/auth/SignUpPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage'

// Pages - App
import { WelcomePage } from './pages/WelcomePage'
import { DashboardPage } from './pages/DashboardPage'
import { ProductsPage } from './pages/ProductsPage'
import { StockPage } from './pages/StockPage'
import { MovementsPage } from './pages/MovementsPage'
import { ReportsPage } from './pages/ReportsPage'
import { AIAssistantPage } from './pages/AIAssistantPage'
import { SettingsPage } from './pages/SettingsPage'
import { TeamsPage } from './pages/TeamsPage'
import { RootRedirect } from './components/RootRedirect'
import { WelcomeGuard } from './components/WelcomeGuard'
import { ROUTES } from './constants/routes'

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    {/* Rotas Públicas */}
                    <Route path={ROUTES.LOGIN} element={<LoginPage />} />
                    <Route path={ROUTES.SIGNUP} element={<SignUpPage />} />
                    <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
                    <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />

                    {/* Rotas Privadas */}
                    <Route element={<PrivateRoute />}>
                        <Route path={ROUTES.WELCOME} element={<WelcomeGuard><WelcomePage /></WelcomeGuard>} />
                        <Route element={<AppLayout />}>
                            <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
                            <Route path={ROUTES.PRODUCTS} element={<ProductsPage />} />
                            <Route path={ROUTES.STOCK} element={<StockPage />} />
                            <Route path={ROUTES.MOVEMENTS} element={<MovementsPage />} />
                            <Route path={ROUTES.REPORTS} element={<ReportsPage />} />
                            <Route path={ROUTES.TEAMS} element={<TeamsPage />} />
                            <Route path={ROUTES.AI_ASSISTANT} element={<AIAssistantPage />} />
                            <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
                            <Route path={ROUTES.ROOT} element={<RootRedirect />} />
                        </Route>
                    </Route>

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    )
}

export default App
