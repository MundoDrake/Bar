import { useState, FormEvent, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export function ResetPasswordPage() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)
    const [validSession, setValidSession] = useState<boolean | null>(null)

    const { updatePassword, session } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        // Check if user has a valid session (from email link)
        if (session) {
            setValidSession(true)
        } else {
            // Wait a bit for session to be established
            const timer = setTimeout(() => {
                setValidSession(session !== null)
            }, 1000)
            return () => clearTimeout(timer)
        }
    }, [session])

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.')
            return
        }

        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.')
            return
        }

        setLoading(true)

        try {
            const { error } = await updatePassword(password)

            if (error) {
                setError('Erro ao redefinir senha. O link pode ter expirado.')
                return
            }

            setSuccess(true)
        } catch {
            setError('Ocorreu um erro inesperado. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    // Loading state while checking session
    if (validSession === null) {
        return (
            <div className="auth-layout">
                <div className="auth-card">
                    <div className="loading-screen" style={{ minHeight: 'auto', padding: '2rem 0' }}>
                        <div className="loading-spinner" />
                        <p>Verificando link...</p>
                    </div>
                </div>
            </div>
        )
    }

    // Invalid or expired link
    if (validSession === false) {
        return (
            <div className="auth-layout">
                <div className="auth-card">
                    <div className="auth-header">
                        <div className="auth-logo">
                            <div className="auth-logo-icon">⚠️</div>
                        </div>
                        <h1 className="auth-title">Link Inválido</h1>
                        <p className="auth-subtitle">
                            Este link de redefinição é inválido ou expirou.
                        </p>
                    </div>

                    <button
                        className="btn btn-primary w-full"
                        onClick={() => navigate('/forgot-password')}
                    >
                        Solicitar Novo Link
                    </button>
                </div>
            </div>
        )
    }

    // Success state
    if (success) {
        return (
            <div className="auth-layout">
                <div className="auth-card">
                    <div className="auth-header">
                        <div className="auth-logo">
                            <div className="auth-logo-icon">✅</div>
                        </div>
                        <h1 className="auth-title">Senha Alterada!</h1>
                        <p className="auth-subtitle">
                            Sua senha foi redefinida com sucesso.
                        </p>
                    </div>

                    <button
                        className="btn btn-primary w-full"
                        onClick={() => navigate('/dashboard')}
                    >
                        Acessar Sistema
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="auth-layout">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-logo">
                        <div className="auth-logo-icon">🔐</div>
                    </div>
                    <h1 className="auth-title">Nova Senha</h1>
                    <p className="auth-subtitle">Digite sua nova senha</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {error && (
                        <div className="alert alert-error">
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="password" className="form-label">Nova Senha</label>
                        <input
                            type="password"
                            id="password"
                            className="form-input"
                            placeholder="Mínimo 6 caracteres"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="new-password"
                            minLength={6}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword" className="form-label">Confirmar Senha</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            className="form-input"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            autoComplete="new-password"
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg w-full"
                        disabled={loading}
                    >
                        {loading ? 'Salvando...' : 'Salvar Nova Senha'}
                    </button>
                </form>
            </div>
        </div>
    )
}
