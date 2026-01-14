import { useState } from 'react'
import { useStock, useMovements } from '../hooks/useStock'
import {
    generateStockReportPDF,
    generateMovementsReportPDF,
    generateLossesReportPDF
} from '../services/reportService'

export function ReportsPage() {
    const { stockItems } = useStock()
    const { movements } = useMovements()
    const [generating, setGenerating] = useState<string | null>(null)

    const handleGenerateStock = () => {
        setGenerating('stock')
        setTimeout(() => {
            generateStockReportPDF(stockItems)
            setGenerating(null)
        }, 500)
    }

    const handleGenerateMovements = () => {
        setGenerating('movements')
        setTimeout(() => {
            generateMovementsReportPDF(movements)
            setGenerating(null)
        }, 500)
    }

    const handleGenerateLosses = () => {
        setGenerating('losses')
        setTimeout(() => {
            generateLossesReportPDF(movements)
            setGenerating(null)
        }, 500)
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Relatórios</h1>
                    <p className="page-subtitle">Exporte dados em formato PDF</p>
                </div>
            </div>

            <div className="reports-grid">
                <div className="report-card">
                    <div className="report-icon">📦</div>
                    <h3 className="report-title">Estoque Atual</h3>
                    <p className="report-description">
                        Lista completa de produtos com quantidades e status de estoque.
                    </p>
                    <button
                        className="btn btn-primary w-full"
                        onClick={handleGenerateStock}
                        disabled={generating !== null || stockItems.length === 0}
                    >
                        {generating === 'stock' ? 'Gerando...' : '📄 Gerar PDF'}
                    </button>
                </div>

                <div className="report-card">
                    <div className="report-icon">🔄</div>
                    <h3 className="report-title">Movimentações</h3>
                    <p className="report-description">
                        Histórico de todas as entradas e saídas de produtos.
                    </p>
                    <button
                        className="btn btn-primary w-full"
                        onClick={handleGenerateMovements}
                        disabled={generating !== null || movements.length === 0}
                    >
                        {generating === 'movements' ? 'Gerando...' : '📄 Gerar PDF'}
                    </button>
                </div>

                <div className="report-card">
                    <div className="report-icon">⚠️</div>
                    <h3 className="report-title">Perdas e Desperdícios</h3>
                    <p className="report-description">
                        Consolidado de todas as perdas registradas no sistema.
                    </p>
                    <button
                        className="btn btn-primary w-full"
                        onClick={handleGenerateLosses}
                        disabled={generating !== null}
                    >
                        {generating === 'losses' ? 'Gerando...' : '📄 Gerar PDF'}
                    </button>
                </div>
            </div>

            {(stockItems.length === 0 || movements.length === 0) && (
                <div className="alert alert-info" style={{ marginTop: '2rem' }}>
                    💡 Alguns relatórios estão indisponíveis porque não há dados suficientes.
                    Cadastre produtos e registre movimentações para gerar relatórios completos.
                </div>
            )}
        </div>
    )
}
