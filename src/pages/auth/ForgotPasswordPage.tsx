import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)

    const { resetPassword } = useAuth()

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const { error } = await resetPassword(email)

            if (error) {
                setError('Erro ao enviar email. Verifique o endereço e tente novamente.')
                return
            }

            setSuccess(true)
        } catch {
            setError('Ocorreu um erro inesperado. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="auth-layout">
                <div className="auth-card">
                    <div className="auth-header">
                        <div className="auth-logo">
                            <div className="auth-logo-icon">✉️</div>
                        </div>
                        <h1 className="auth-title">Email Enviado!</h1>
                        <p className="auth-subtitle">
                            Enviamos instruções de redefinição para <strong>{email}</strong>
                        </p>
                    </div>

                    <div className="alert alert-success">
                        Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                    </div>

                    <Link to="/login" className="btn btn-secondary w-full mt-4">
                        Voltar para Login
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="auth-layout">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-logo">
                        <div className="auth-logo-icon">🔑</div>
                    </div>
                    <h1 className="auth-title">Recuperar Senha</h1>
                    <p className="auth-subtitle">Digite seu email para receber um link de redefinição</p>
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

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg w-full"
                        disabled={loading}
                    >
                        {loading ? 'Enviando...' : 'Enviar Link'}
                    </button>
                </form>

                <p className="auth-footer">
                    Lembrou a senha? <Link to="/login">Voltar para login</Link>
                </p>
            </div>
        </div>
    )
}
