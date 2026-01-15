import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState, useEffect } from 'react'
import { createTeam, joinTeamByOwnerCustomId } from '../services/teamService'
import { useTeams } from '../hooks/useTeamsHook'
import { ROUTES } from '../constants/routes'

export function WelcomePage() {
    const { user, customId } = useAuth()
    const { teams, loading: teamsLoading, refresh } = useTeams()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [joinId, setJoinId] = useState('')
    const [joiningTeam, setJoiningTeam] = useState(false)

    const hasTeam = teams.length > 0
    const isLoading = loading || teamsLoading

    // Auto-redirect if user already has a team
    useEffect(() => {
        if (!teamsLoading && hasTeam) {
            navigate(ROUTES.DASHBOARD, { replace: true })
        }
    }, [hasTeam, teamsLoading, navigate])

    const handleCreateDashboard = async () => {
        setLoading(true)
        setError(null)
        try {
            const teamName = `Estoque de ${user?.email?.split('@')[0] || 'Geral'}`
            await createTeam(user!.id, teamName)

            // Force a refresh of the teams list
            if (refresh) {
                await refresh();
            }

            // Force navigation immediately after success
            navigate(ROUTES.DASHBOARD, { replace: true })
        } catch (err) {
            console.error('Error creating dashboard:', err)
            setError('Erro ao criar dashboard. Tente novamente.')
            setLoading(false)
        }
    }

    const handleJoinTeam = async () => {
        if (!joinId.trim() || !user?.id) return
        setJoiningTeam(true)
        setError(null)

        try {
            const result = await joinTeamByOwnerCustomId(joinId.trim().toUpperCase(), user.id)

            if (result.success) {
                setSuccess('Você entrou no time com sucesso! Redirecionando...')
                setTimeout(() => {
                    navigate(ROUTES.DASHBOARD, { replace: true })
                    window.location.reload()
                }, 1500)
            } else {
                setError(result.error || 'Erro ao entrar no time.')
            }
        } catch (e) {
            setError('Erro ao processar. Verifique o ID.')
        }

        setJoiningTeam(false)
    }

    const copyId = () => {
        if (customId) {
            navigator.clipboard.writeText(customId)
            setSuccess('ID copiado!')
            setTimeout(() => setSuccess(null), 2000)
        }
    }

    // Don't render content if we are redirecting
    if (!teamsLoading && hasTeam) return null

    return (
        <div className="auth-layout">
            <div className="auth-card" style={{ maxWidth: '420px' }}>
                {/* Header */}
                <div className="auth-header">
                    <div className="auth-logo">
                        <div className="auth-logo-icon">🍺</div>
                    </div>
                    <h1 className="auth-title">Bem-vindo!</h1>
                    <p className="auth-subtitle">
                        Sua jornada de gerenciamento inteligente começa aqui.
                    </p>
                </div>

                {/* Messages */}
                {error && (
                    <div className="alert alert-error mb-4">
                        ⚠️ {error}
                    </div>
                )}
                {success && (
                    <div className="alert alert-success mb-4">
                        ✅ {success}
                    </div>
                )}

                {/* Your ID Section */}
                <div className="settings-section mb-4">
                    <h2 className="settings-section-title">🆔 Seu ID de Membro</h2>
                    <p className="settings-section-description">
                        Compartilhe este código para ser adicionado a outros times.
                    </p>

                    <div className="settings-options">
                        <div className="settings-option">
                            <div className="settings-option-info">
                                <span className="settings-option-label">Seu Código Único</span>
                                <span className="settings-option-description">Clique para copiar</span>
                            </div>
                            <code
                                onClick={copyId}
                                className="mono"
                                style={{
                                    padding: '8px 16px',
                                    background: 'var(--color-primary-500)',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 'bold',
                                    fontSize: 'var(--font-size-lg)',
                                    letterSpacing: '0.1em',
                                    cursor: 'pointer',
                                    color: 'var(--color-neutral-950)'
                                }}
                            >
                                {customId || '...'}
                            </code>
                        </div>
                    </div>
                </div>

                {/* Join Existing Team */}
                <div className="settings-section mb-4">
                    <h2 className="settings-section-title">🤝 Entrar em um Time</h2>
                    <p className="settings-section-description">
                        Insira o ID do dono do time para acessar o dashboard dele.
                    </p>

                    <div className="settings-options">
                        <div className="settings-option">
                            <div className="settings-option-info">
                                <span className="settings-option-label">ID do Dono</span>
                                <span className="settings-option-description">Código de 8 caracteres</span>
                            </div>
                            <div className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="ABC123XP"
                                    value={joinId}
                                    onChange={(e) => setJoinId(e.target.value.toUpperCase())}
                                    disabled={joiningTeam}
                                    maxLength={10}
                                    style={{ width: '120px', textTransform: 'uppercase' }}
                                />
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={handleJoinTeam}
                                    disabled={joiningTeam || !joinId.trim()}
                                >
                                    {joiningTeam ? 'Entrando...' : 'Entrar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Create Your Own Dashboard */}
                <div className="settings-section">
                    <h2 className="settings-section-title">✨ Criar Meu Dashboard</h2>
                    <p className="settings-section-description">
                        Dono do negócio? Crie seu próprio painel para gerenciar produtos e estoque.
                    </p>

                    <button
                        onClick={handleCreateDashboard}
                        disabled={isLoading || !user}
                        className="btn btn-primary btn-lg w-full mt-4"
                    >
                        {isLoading
                            ? 'Preparando seu ambiente...'
                            : 'Criar meu Painel'}
                    </button>
                </div>

                {/* Footer */}
                <div className="auth-footer mt-4">
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-600)' }}>
                        Criado por Vall Strategy © 2026
                    </span>
                </div>
            </div>
        </div>
    )
}
