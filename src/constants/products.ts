// Product categories for bar inventory
export const PRODUCT_CATEGORIES = [
    { value: 'bebidas-destiladas', label: 'Bebidas Destiladas' },
    { value: 'bebidas-fermentadas', label: 'Bebidas Fermentadas' },
    { value: 'vinhos', label: 'Vinhos' },
    { value: 'refrigerantes', label: 'Refrigerantes' },
    { value: 'sucos', label: 'Sucos' },
    { value: 'agua', label: 'Água' },
    { value: 'energeticos', label: 'Energéticos' },
    { value: 'mixers', label: 'Mixers e Tônicas' },
    { value: 'ingredientes', label: 'Ingredientes' },
    { value: 'frutas', label: 'Frutas' },
    { value: 'descartaveis', label: 'Descartáveis' },
    { value: 'outros', label: 'Outros' },
] as const

// Units of measurement
export const PRODUCT_UNITS = [
    { value: 'un', label: 'Unidade' },
    { value: 'garrafa', label: 'Garrafa' },
    { value: 'lata', label: 'Lata' },
    { value: 'litro', label: 'Litro' },
    { value: 'ml', label: 'Mililitro' },
    { value: 'kg', label: 'Quilograma' },
    { value: 'g', label: 'Grama' },
    { value: 'caixa', label: 'Caixa' },
    { value: 'pacote', label: 'Pacote' },
    { value: 'dose', label: 'Dose' },
] as const

// Movement reasons
export const MOVEMENT_REASONS = {
    entrada: [
        { value: 'compra', label: 'Compra' },
        { value: 'doacao', label: 'Doação' },
        { value: 'transferencia', label: 'Transferência' },
        { value: 'ajuste', label: 'Ajuste de Inventário' },
    ],
    saida: [
        { value: 'venda', label: 'Venda' },
        { value: 'uso-interno', label: 'Uso Interno' },
        { value: 'preparo-drink', label: 'Preparo de Drink' },
        { value: 'transferencia', label: 'Transferência' },
    ],
    perda: [
        { value: 'vencimento', label: 'Vencimento' },
        { value: 'quebra', label: 'Quebra' },
        { value: 'roubo', label: 'Roubo' },
        { value: 'desperdicio', label: 'Desperdício' },
    ],
    ajuste: [
        { value: 'inventario', label: 'Ajuste de Inventário' },
        { value: 'correcao', label: 'Correção de Erro' },
    ],
} as const

// Type exports
export type ProductCategory = typeof PRODUCT_CATEGORIES[number]['value']
export type ProductUnit = typeof PRODUCT_UNITS[number]['value']
