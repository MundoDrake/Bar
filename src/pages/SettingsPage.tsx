import { useState, useEffect } from 'react'
// Force rebuild timestamp: 2026-01-15 16:30

import { supabase } from '../lib/supabase'
import { usePreferences } from '../hooks/usePreferences'
import { useAuth } from '../contexts/AuthContext'
import { addMemberToTeam, findUserByCustomId } from '../services/teamService'
import { useTeams } from '../hooks/useTeamsHook'


export function SettingsPage() {
    const { preferences, loading, error, updatePreferences } = usePreferences()
    const { customId, user } = useAuth()
    const { teams } = useTeams()

    const [saving, setSaving] = useState(false)
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [memberIdToAdd, setMemberIdToAdd] = useState('')
    const [addingMember, setAddingMember] = useState(false)

    // Display name state
    const [displayName, setDisplayName] = useState('')
    const [savingName, setSavingName] = useState(false)

    // Load display name on mount
    useEffect(() => {
        if (user?.id) {
            supabase
                .from('user_profiles')
                .select('display_name')
                .eq('user_id', user.id)
                .maybeSingle()
                .then(({ data }) => {
                    if (data?.display_name) {
                        setDisplayName(data.display_name)
                    }
                })
        }
    }, [user?.id])

    // Save display name
    const handleSaveDisplayName = async () => {
        if (!user?.id) return
        setSavingName(true)
        setSaveMessage(null)

        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({ display_name: displayName.trim() || null })
                .eq('user_id', user.id)

            if (error) throw error

            setSaveMessage({ type: 'success', text: 'Nome salvo com sucesso!' })
            setTimeout(() => setSaveMessage(null), 3000)
        } catch {
            setSaveMessage({ type: 'error', text: 'Erro ao salvar nome.' })
        }

        setSavingName(false)
    }

    const handleToggle = async (key: 'alert_low_stock' | 'alert_expiry' | 'alert_ai_suggestions') => {
        if (!preferences || saving) return

        setSaving(true)
        setSaveMessage(null)

        const result = await updatePreferences({
            [key]: !preferences[key],
        })

        setSaving(false)
        if (result.error) {
            setSaveMessage({ type: 'error', text: result.error })
        } else {
            setSaveMessage({ type: 'success', text: 'Preferências atualizadas!' })
            setTimeout(() => setSaveMessage(null), 3000)
        }
    }

    const handleExpiryDaysChange = async (days: number) => {
        if (!preferences || saving) return

        setSaving(true)
        setSaveMessage(null)

        const result = await updatePreferences({
            alert_expiry_days: days,
        })

        setSaving(false)
        if (result.error) {
            setSaveMessage({ type: 'error', text: result.error })
        } else {
            setSaveMessage({ type: 'success', text: 'Preferências atualizadas!' })
            setTimeout(() => setSaveMessage(null), 3000)
        }
    }

    const handleAddMember = async () => {
        if (!memberIdToAdd.trim() || !user?.id) return

        setAddingMember(true);
        setSaveMessage(null);

        try {
            // 1. Identificar o time do usuário (Dono)
            // Tenta achar no estado local primeiro
            let myTeam = teams.find(t => t.owner_user_id === user.id)

            // Fallback: Se não achar no estado, busca direto no banco (pode ser delay de atualização)
            if (!myTeam) {
                const { data } = await supabase
                    .from('teams')
                    .select('*')
                    .eq('owner_user_id', user.id)
                    .maybeSingle();

                if (data) {
                    myTeam = data;
                }
            }

            if (!myTeam) {
                setSaveMessage({ type: 'error', text: 'Você precisa ser dono de um time para adicionar membros.' })
                setAddingMember(false);
                return
            }

            // 2. Buscar usuário pelo ID customizado
            // Find user by Custom ID
            const targetUserId = await findUserByCustomId(memberIdToAdd.trim().toUpperCase());
            if (!targetUserId) {
                setSaveMessage({ type: 'error', text: 'Usuário não encontrado com este ID.' });
                setAddingMember(false);
                return;
            }

            if (targetUserId === user.id) {
                setSaveMessage({ type: 'error', text: 'Você não pode adicionar a si mesmo.' });
                setAddingMember(false);
                return;
            }

            // 3. Adicionar ao time
            // Add to team - this function might throw if already member (handled in catch or if logic allows)
            await addMemberToTeam(myTeam.id, targetUserId); // Ignoring return value if void, or checking result

            setSaveMessage({ type: 'success', text: 'Membro adicionado com sucesso!' })
            setMemberIdToAdd('')
        } catch (e: unknown) {
            console.error('Error in handleAddMember:', e);
            if ((e as { code?: string }).code === '23505') { // Unique violation
                setSaveMessage({ type: 'error', text: 'Este usuário já está no time.' });
            } else {
                setSaveMessage({ type: 'error', text: 'Erro ao adicionar membro.' })
            }
        }

        setAddingMember(false)
    }

    if (loading) {
        return (
            <div className="page-container">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Configurações</h1>
                        <p className="page-subtitle">Personalize suas preferências</p>
                    </div>
                </div>
                <div className="settings-loading">
                    <div className="skeleton settings-card-skeleton" />
                    <div className="skeleton settings-card-skeleton" />
                </div>
            </div>
        )
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Configurações</h1>
                    <p className="page-subtitle">Personalize suas preferências</p>
                </div>
            </div>

            {error && (
                <div className="alert alert-error">
                    {error}
                </div>
            )}

            {saveMessage && (
                <div className={`alert alert-${saveMessage.type}`}>
                    {saveMessage.text}
                </div>
            )}

            <div className="settings-sections">
                {/* Profile Section */}
                <div className="settings-section">
                    <h2 className="settings-section-title">👤 Perfil</h2>
                    <p className="settings-section-description">
                        Como você aparece para o seu time
                    </p>

                    <div className="settings-options">
                        <div className="settings-option">
                            <div className="settings-option-info">
                                <span className="settings-option-label">Nome de Exibição</span>
                                <span className="settings-option-description">
                                    Seu nome visível para outros membros
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Seu nome"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    disabled={savingName}
                                    style={{ width: '200px' }}
                                />
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={handleSaveDisplayName}
                                    disabled={savingName || !displayName.trim()}
                                >
                                    {savingName ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notifications Section */}
                <div className="settings-section">
                    <h2 className="settings-section-title">🔔 Notificações</h2>
                    <p className="settings-section-description">
                        Configure quais alertas você deseja receber
                    </p>

                    <div className="settings-options">
                        <div className="settings-option">
                            <div className="settings-option-info">
                                <span className="settings-option-label">Alerta de Estoque Baixo</span>
                                <span className="settings-option-description">
                                    Receba avisos quando produtos atingirem o nível mínimo
                                </span>
                            </div>
                            <label className="toggle">
                                <input
                                    type="checkbox"
                                    checked={preferences?.alert_low_stock ?? true}
                                    onChange={() => handleToggle('alert_low_stock')}
                                    disabled={saving}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="settings-option">
                            <div className="settings-option-info">
                                <span className="settings-option-label">Alerta de Vencimento</span>
                                <span className="settings-option-description">
                                    Receba avisos sobre produtos próximos da validade
                                </span>
                            </div>
                            <label className="toggle">
                                <input
                                    type="checkbox"
                                    checked={preferences?.alert_expiry ?? true}
                                    onChange={() => handleToggle('alert_expiry')}
                                    disabled={saving}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        {preferences?.alert_expiry && (
                            <div className="settings-option sub-option">
                                <div className="settings-option-info">
                                    <span className="settings-option-label">Dias de antecedência</span>
                                    <span className="settings-option-description">
                                        Quantos dias antes do vencimento alertar
                                    </span>
                                </div>
                                <select
                                    className="form-select settings-select"
                                    value={preferences?.alert_expiry_days ?? 7}
                                    onChange={(e) => handleExpiryDaysChange(parseInt(e.target.value))}
                                    disabled={saving}
                                >
                                    <option value={3}>3 dias</option>
                                    <option value={5}>5 dias</option>
                                    <option value={7}>7 dias</option>
                                    <option value={14}>14 dias</option>
                                    <option value={30}>30 dias</option>
                                </select>
                            </div>
                        )}

                        <div className="settings-option">
                            <div className="settings-option-info">
                                <span className="settings-option-label">Sugestões de IA</span>
                                <span className="settings-option-description">
                                    Receba sugestões automáticas de reposição
                                </span>
                            </div>
                            <label className="toggle">
                                <input
                                    type="checkbox"
                                    checked={preferences?.alert_ai_suggestions ?? true}
                                    onChange={() => handleToggle('alert_ai_suggestions')}
                                    disabled={saving}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Team Section */}
                <div className="settings-section">
                    <h2 className="settings-section-title">Time</h2>
                    <p className="settings-section-description">
                        Adicione membros ao seu time de estoque
                    </p>

                    <div className="settings-options">
                        <div className="settings-option">
                            <div className="settings-option-info">
                                <span className="settings-option-label">Seu ID</span>
                                <span className="settings-option-description">
                                    Compartilhe este ID para outros te adicionarem
                                </span>
                            </div>
                            <code style={{ padding: '8px 12px', background: 'var(--color-surface)', borderRadius: '6px', fontWeight: 'bold' }}>
                                {customId || 'Carregando...'}
                            </code>
                        </div>

                        <div className="settings-option">
                            <div className="settings-option-info">
                                <span className="settings-option-label">Adicionar Membro</span>
                                <span className="settings-option-description">
                                    Insira o ID do usuário para adicioná-lo ao seu time
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="ID do Membro"
                                    value={memberIdToAdd}
                                    onChange={(e) => setMemberIdToAdd(e.target.value.toUpperCase())}
                                    disabled={addingMember}
                                    style={{ width: '160px', textTransform: 'uppercase' }}
                                />
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={handleAddMember}
                                    disabled={addingMember || !memberIdToAdd.trim()}
                                >
                                    {addingMember ? 'Adicionando...' : 'Adicionar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* About Section */}
                <div className="settings-section">
                    <h2 className="settings-section-title">ℹ️ Sobre</h2>
                    <div className="about-info">
                        <p><strong>Bar Stock Manager</strong></p>
                        <p>Versão 1.0.0</p>
                        <p className="about-description">
                            Sistema de gestão de estoque inteligente para bares e restaurantes.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
