import { useState } from 'react'
import { usePreferences } from '../hooks/usePreferences'

export function SettingsPage() {
    const { preferences, loading, error, updatePreferences } = usePreferences()
    const [saving, setSaving] = useState(false)
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

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
