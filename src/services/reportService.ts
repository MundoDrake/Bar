import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ProductWithStock, StockMovement } from '../types/database'
import { PRODUCT_CATEGORIES, PRODUCT_UNITS, MOVEMENT_REASONS } from '../constants/products'

// Extend jsPDF type for autotable
interface jsPDFWithAutoTable extends jsPDF {
    lastAutoTable: { finalY: number }
}

const formatDate = (date: Date): string => {
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    })
}

const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

const getCategoryLabel = (category: string) => {
    return PRODUCT_CATEGORIES.find(c => c.value === category)?.label || category
}

const getUnitLabel = (unit: string) => {
    return PRODUCT_UNITS.find(u => u.value === unit)?.label || unit
}

const getReasonLabel = (type: string, reason: string) => {
    const reasons = MOVEMENT_REASONS[type as keyof typeof MOVEMENT_REASONS] || []
    return reasons.find(r => r.value === reason)?.label || reason || '-'
}

const addHeader = (doc: jsPDF, title: string) => {
    doc.setFontSize(20)
    doc.setTextColor(40, 40, 40)
    doc.text(title, 14, 22)

    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Gerado em: ${formatDateTime(new Date().toISOString())}`, 14, 30)

    doc.setDrawColor(200)
    doc.line(14, 34, 196, 34)
}

const addFooter = (doc: jsPDF) => {
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(
            `Página ${i} de ${pageCount} | Bar Stock Manager`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
        )
    }
}

// Generate Stock Report PDF
export function generateStockReportPDF(products: ProductWithStock[]): void {
    const doc = new jsPDF() as jsPDFWithAutoTable

    addHeader(doc, 'Relatório de Estoque Atual')

    const tableData = products.map(product => [
        product.name,
        getCategoryLabel(product.category),
        `${product.stock?.quantity ?? 0} ${getUnitLabel(product.unit)}`,
        product.min_stock_level > 0
            ? `${product.min_stock_level} ${getUnitLabel(product.unit)}`
            : '-',
        (product.stock?.quantity ?? 0) <= product.min_stock_level && product.min_stock_level > 0
            ? 'Baixo'
            : 'OK',
    ])

    autoTable(doc, {
        startY: 40,
        head: [['Produto', 'Categoria', 'Quantidade', 'Mínimo', 'Status']],
        body: tableData,
        headStyles: {
            fillColor: [245, 158, 11],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245],
        },
        columnStyles: {
            4: {
                cellWidth: 25,
                halign: 'center',
            },
        },
    })

    // Summary
    const lowStockCount = products.filter(
        p => (p.stock?.quantity ?? 0) <= p.min_stock_level && p.min_stock_level > 0
    ).length

    doc.setFontSize(11)
    doc.setTextColor(60)
    doc.text(`Total de produtos: ${products.length}`, 14, doc.lastAutoTable.finalY + 15)
    doc.text(`Produtos com estoque baixo: ${lowStockCount}`, 14, doc.lastAutoTable.finalY + 22)

    addFooter(doc)
    doc.save(`estoque_${formatDate(new Date()).replace(/\//g, '-')}.pdf`)
}

// Generate Movements Report PDF
export function generateMovementsReportPDF(
    movements: (StockMovement & { product: { name: string } })[],
    startDate?: Date,
    endDate?: Date
): void {
    const doc = new jsPDF() as jsPDFWithAutoTable

    let title = 'Relatório de Movimentações'
    if (startDate && endDate) {
        title += ` (${formatDate(startDate)} - ${formatDate(endDate)})`
    }

    addHeader(doc, title)

    const typeLabels: Record<string, string> = {
        entrada: 'Entrada',
        saida: 'Saída',
        perda: 'Perda',
        ajuste: 'Ajuste',
    }

    const tableData = movements.map(m => [
        formatDateTime(m.created_at),
        m.product.name,
        typeLabels[m.type] || m.type,
        m.quantity.toString(),
        getReasonLabel(m.type, m.reason || ''),
    ])

    autoTable(doc, {
        startY: 40,
        head: [['Data/Hora', 'Produto', 'Tipo', 'Qtd', 'Motivo']],
        body: tableData,
        headStyles: {
            fillColor: [245, 158, 11],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245],
        },
        columnStyles: {
            2: { cellWidth: 22 },
            3: { cellWidth: 18, halign: 'center' },
        },
    })

    // Summary by type
    const summary = movements.reduce((acc, m) => {
        acc[m.type] = (acc[m.type] || 0) + m.quantity
        return acc
    }, {} as Record<string, number>)

    const yStart = doc.lastAutoTable.finalY + 15
    doc.setFontSize(11)
    doc.setTextColor(60)
    doc.text(`Total de movimentações: ${movements.length}`, 14, yStart)

    let yPos = yStart + 8
    Object.entries(summary).forEach(([type, total]) => {
        doc.text(`${typeLabels[type] || type}: ${total} unidades`, 14, yPos)
        yPos += 7
    })

    addFooter(doc)
    doc.save(`movimentacoes_${formatDate(new Date()).replace(/\//g, '-')}.pdf`)
}

// Generate Losses Report PDF
export function generateLossesReportPDF(
    movements: (StockMovement & { product: { name: string } })[]
): void {
    const doc = new jsPDF() as jsPDFWithAutoTable

    const losses = movements.filter(m => m.type === 'perda')

    addHeader(doc, 'Relatório de Perdas e Desperdícios')

    if (losses.length === 0) {
        doc.setFontSize(12)
        doc.text('Nenhuma perda registrada no período.', 14, 50)
        addFooter(doc)
        doc.save(`perdas_${formatDate(new Date()).replace(/\//g, '-')}.pdf`)
        return
    }

    const tableData = losses.map(m => [
        formatDateTime(m.created_at),
        m.product.name,
        m.quantity.toString(),
        getReasonLabel(m.type, m.reason || ''),
        m.notes || '-',
    ])

    autoTable(doc, {
        startY: 40,
        head: [['Data/Hora', 'Produto', 'Qtd', 'Motivo', 'Observações']],
        body: tableData,
        headStyles: {
            fillColor: [220, 38, 38],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
        },
        alternateRowStyles: {
            fillColor: [254, 242, 242],
        },
    })

    // Summary by reason
    const byReason = losses.reduce((acc, m) => {
        const reason = getReasonLabel(m.type, m.reason || '')
        acc[reason] = (acc[reason] || 0) + m.quantity
        return acc
    }, {} as Record<string, number>)

    const yStart = doc.lastAutoTable.finalY + 15
    doc.setFontSize(11)
    doc.setTextColor(60)
    doc.text(`Total de perdas: ${losses.length} registros`, 14, yStart)

    let yPos = yStart + 10
    doc.text('Perdas por motivo:', 14, yPos)
    yPos += 7

    Object.entries(byReason).forEach(([reason, total]) => {
        doc.text(`• ${reason}: ${total} unidades`, 18, yPos)
        yPos += 6
    })

    addFooter(doc)
    doc.save(`perdas_${formatDate(new Date()).replace(/\//g, '-')}.pdf`)
}
