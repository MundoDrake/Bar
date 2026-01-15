import { useState } from 'react';
import { useTeams } from '../hooks/useTeamsHook';
import { useAuth } from '../contexts/AuthContext';
import { addMemberToTeam, findUserByCustomId } from '../services/teamService';

export function TeamsPage() {
    const { customId, user } = useAuth();
    const { teams, members, loading, refresh, updateMemberPermissions } = useTeams();
    const [inviteId, setInviteId] = useState('');
    const [isInviting, setIsInviting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // For now, we assume the user manages their first team or the one they own
    // Filters teams where the user is the owner
    const ownedTeams = teams.filter(t => t.owner_user_id === user?.id);
    const primaryTeam = ownedTeams[0]; // Simplification for single-team context

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setIsInviting(true);

        try {
            if (!primaryTeam) {
                setMessage({ type: 'error', text: 'Você não possui um time para gerenciar.' });
                return;
            }

            if (inviteId === customId) {
                setMessage({ type: 'error', text: 'Você não pode convidar a si mesmo.' });
                return;
            }

            // 1. Find user by Custom ID
            const targetUserId = await findUserByCustomId(inviteId.toUpperCase());
            if (!targetUserId) {
                setMessage({ type: 'error', text: 'Usuário não encontrado com este ID.' });
                return;
            }

            // 2. Add to team
            await addMemberToTeam(primaryTeam.id, targetUserId);

            setMessage({ type: 'success', text: 'Membro adicionado com sucesso!' });
            setInviteId('');
            if (refresh) refresh();

        } catch (err: any) {
            console.error('Error inviting member:', err);
            // Check for unique violation or other errors
            if (err.code === '23505') { // Unique violation
                setMessage({ type: 'error', text: 'Este usuário já está no time.' });
            } else {
                setMessage({ type: 'error', text: 'Erro ao adicionar membro.' });
            }
        } finally {
            setIsInviting(false);
        }
    };

    const handlePermissionChange = async (memberId: string, routeKey: string, checked: boolean) => {
        if (!primaryTeam) return;

        const teamMembers = members[primaryTeam.id] || [];
        const member = teamMembers.find(m => m.id === memberId);
        if (!member) return;

        // Current allowed routes (null means all)
        // If null, we first convert to all routes array then remove one
        const allRoutes = ['dashboard', 'products', 'stock', 'movements', 'reports', 'ai'];

        let newRoutes: string[] = [];

        if (member.allowed_routes === null) {
            if (!checked) {
                // If unchecking, start with all routes minus the one uncheck
                newRoutes = allRoutes.filter(r => r !== routeKey);
            } else {
                // If checking (shouldn't happen if null serves as all), just keep as null
                return;
            }
        } else {
            if (checked) {
                newRoutes = [...member.allowed_routes, routeKey];
            } else {
                newRoutes = member.allowed_routes.filter(r => r !== routeKey);
            }
        }

        // Check optimize: if all routes selected, set to null
        const isAllSelected = allRoutes.every(r => newRoutes.includes(r));
        const finalRoutes = isAllSelected ? null : newRoutes;

        await updateMemberPermissions(primaryTeam.id, memberId, finalRoutes);
    };

    const copyId = () => {
        if (customId) {
            navigator.clipboard.writeText(customId);
        }
    };

    if (loading) {
        return (
            <div className="page-container">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Gerenciar Time</h1>
                        <p className="page-subtitle">Colabore com sua equipe gerenciando o acesso ao estoque.</p>
                    </div>
                </div>
                <div className="settings-loading">
                    <div className="skeleton settings-card-skeleton" />
                    <div className="skeleton settings-card-skeleton" />
                </div>
            </div>
        )
    }

    const teamMembers = primaryTeam ? members[primaryTeam.id] || [] : [];

    // Permission columns
    const permissionCols = [
        { key: 'dashboard', label: 'Dashboard' },
        { key: 'products', label: 'Produtos' },
        { key: 'stock', label: 'Estoque' },
        // { key: 'movements', label: 'Movimentações' }, // Optional to save space
        { key: 'reports', label: 'Relatórios' },
        { key: 'ai', label: 'IA' },
    ];

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Gerenciar Time</h1>
                    <p className="page-subtitle">Colabore com sua equipe gerenciando o acesso ao estoque.</p>
                </div>
            </div>

            {message && (
                <div className={`alert alert-${message.type}`}>
                    {message.type === 'success' ? '✅' : '⚠️'} {message.text}
                </div>
            )}

            <div className="settings-sections">
                {/* User's Own ID Section - Only for owners */}
                {primaryTeam && (
                    <div className="settings-section">
                        <h2 className="settings-section-title">🆔 ID do Time</h2>
                        <p className="settings-section-description">
                            Compartilhe este código para convidar pessoas para o seu time.
                        </p>

                        <div className="settings-options">
                            <div className="settings-option">
                                <div className="settings-option-info">
                                    <span className="settings-option-label">Código de Convite</span>
                                    <span className="settings-option-description">
                                        Clique para copiar
                                    </span>
                                </div>
                                <code
                                    onClick={copyId}
                                    style={{
                                        padding: '8px 16px',
                                        background: 'var(--color-primary-500)',
                                        borderRadius: '6px',
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
                )}

                {/* Invite Form Section - only for team owners */}
                {primaryTeam && (
                    <div className="settings-section">
                        <h2 className="settings-section-title">➕ Adicionar Membro</h2>
                        <p className="settings-section-description">
                            Insira o ID personalizado de quem deseja adicionar ao seu time.
                        </p>

                        <form onSubmit={handleInvite}>
                            <div className="settings-options">
                                <div className="settings-option">
                                    <div className="settings-option-info">
                                        <span className="settings-option-label">ID do Usuário</span>
                                        <span className="settings-option-description">
                                            Código de 8 caracteres do membro
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={inviteId}
                                            onChange={(e) => setInviteId(e.target.value.toUpperCase())}
                                            placeholder="EX: ABC123XP"
                                            maxLength={10}
                                            required
                                            style={{ width: '140px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}
                                        />
                                        <button
                                            type="submit"
                                            className="btn btn-primary btn-sm"
                                            disabled={isInviting || !inviteId}
                                        >
                                            {isInviting ? 'Adicionando...' : 'Convidar'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                {/* Members List Section */}
                <div className="settings-section">
                    <h2 className="settings-section-title">👥 Membros do Time</h2>
                    <p className="settings-section-description">
                        {primaryTeam
                            ? `${teamMembers.length} membro(s) ativo(s) no time`
                            : 'Você não é dono de nenhum time no momento'
                        }
                    </p>

                    {primaryTeam ? (
                        teamMembers.length > 0 ? (
                            <div className="stock-table-container">
                                <table className="stock-table">
                                    <thead>
                                        <tr>
                                            <th>Membro</th>
                                            <th>ID (Custom)</th>
                                            <th>Papel</th>
                                            {/* Permission Columns */}
                                            {permissionCols.map(col => (
                                                <th key={col.key} style={{ textAlign: 'center' }}>
                                                    {col.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teamMembers.map((member) => (
                                            <tr key={member.id}>
                                                <td className="stock-product-name">
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontWeight: 600 }}>
                                                            {member.display_name || (member.role === 'owner' ? 'Você (Dono)' : 'Membro Sem Nome')}
                                                        </span>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-400)' }}>
                                                            {member.role === 'owner' ? 'Administrador' : 'Colaborador'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <code style={{
                                                        background: 'var(--color-neutral-800)',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: 'var(--font-size-xs)'
                                                    }}>
                                                        {member.custom_id || member.user_id.slice(0, 8)}
                                                    </code>
                                                </td>
                                                <td>
                                                    <span className={`badge ${member.role === 'owner' ? 'badge-warning' : 'badge-success'}`}>
                                                        {member.role === 'owner' ? 'Admin' : 'Membro'}
                                                    </span>
                                                </td>

                                                {/* Permission Checkboxes */}
                                                {permissionCols.map(col => {
                                                    const isChecked = member.role === 'owner' ||
                                                        member.allowed_routes === null ||
                                                        member.allowed_routes.includes(col.key);

                                                    const isDisabled = member.role === 'owner'; // Owner always has all permissions

                                                    return (
                                                        <td key={col.key} style={{ textAlign: 'center' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                disabled={isDisabled}
                                                                onChange={(e) => handlePermissionChange(member.id, col.key, e.target.checked)}
                                                                style={{
                                                                    accentColor: 'var(--color-primary-500)',
                                                                    cursor: isDisabled ? 'default' : 'pointer',
                                                                    width: '16px',
                                                                    height: '16px'
                                                                }}
                                                            />
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="about-info" style={{ textAlign: 'center' }}>
                                <p>Nenhum membro encontrado.</p>
                                <p className="about-description">Convide membros usando o formulário acima.</p>
                            </div>
                        )
                    ) : (
                        <div className="about-info" style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--spacing-2)' }}>🚫</p>
                            <p><strong>Sem Time Ativo</strong></p>
                            <p className="about-description">
                                Você não é dono de nenhum time. Apenas donos podem adicionar novos membros.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
