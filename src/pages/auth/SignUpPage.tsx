import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export function SignUpPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)

    const { signUp } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')

        // Validate passwords match
        if (password !== confirmPassword) {
            setError('As senhas não coincidem.')
            return
        }

        // Validate password length
        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.')
            return
        }

        setLoading(true)

        try {
            const { error } = await signUp(email, password)

            if (error) {
                setError(getErrorMessage(error.message))
                return
            }

            setSuccess(true)
        } catch {
            setError('Ocorreu um erro inesperado. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    const getErrorMessage = (message: string): string => {
        if (message.includes('User already registered')) {
            return 'Este email já está cadastrado.'
        }
        if (message.includes('Password should be at least')) {
            return 'A senha deve ter pelo menos 6 caracteres.'
        }
        return 'Erro ao criar conta. Tente novamente.'
    }

    if (success) {
        return (
            <div className="auth-layout">
                <div className="auth-card">
                    <div className="auth-header">
                        <div className="auth-logo">
                            <div className="auth-logo-icon">✉️</div>
                        </div>
                        <h1 className="auth-title">Verifique seu email</h1>
                        <p className="auth-subtitle">
                            Enviamos um link de confirmação para <strong>{email}</strong>
                        </p>
                    </div>

                    <div className="alert alert-success">
                        Clique no link enviado para seu email para ativar sua conta.
                    </div>

                    <button
                        className="btn btn-secondary w-full mt-4"
                        onClick={() => navigate('/login')}
                    >
                        Voltar para Login
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
                        <div className="auth-logo-icon">🍺</div>
                    </div>
                    <h1 className="auth-title">Criar Conta</h1>
                    <p className="auth-subtitle">Comece a gerenciar seu estoque hoje</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {error && (
                        <div className="alert alert-error">
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email" className="form-label">Email</label>
                        <input
                            type="email"
                            id="email"
                            className="form-input"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password" className="form-label">Senha</label>
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
                        <span className="form-hint">Mínimo de 6 caracteres</span>
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
                        {loading ? 'Criando conta...' : 'Criar Conta'}
                    </button>
                </form>

                <p className="auth-footer">
                    Já tem conta? <Link to="/login">Fazer login</Link>
                </p>
            </div>
        </div>
    )
}
