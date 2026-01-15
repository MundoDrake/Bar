// Database types for Bar Stock Manager

export type MovementType = 'entrada' | 'saida' | 'perda' | 'ajuste'

export interface Product {
    id: string
    user_id: string
    name: string
    category: string
    unit: string
    min_stock_level: number
    expiry_tracking: boolean
    notes: string | null
    created_at: string
    updated_at: string
}

export interface Stock {
    id: string
    product_id: string
    quantity: number
    updated_at: string
}

export interface StockMovement {
    id: string
    product_id: string
    type: MovementType
    quantity: number
    reason: string | null
    expiry_date: string | null
    notes: string | null
    created_at: string
}

export interface ProductBatch {
    id: string
    product_id: string
    quantity: number
    expiry_date: string | null
    received_at: string
    created_at: string
}

export interface UserPreferences {
    id: string
    user_id: string
    alert_low_stock: boolean
    alert_expiry: boolean
    alert_expiry_days: number
    alert_ai_suggestions: boolean
    created_at: string
    updated_at: string
}

// Team and membership types for collaboration
export interface Team {
    id: string
    name: string
    owner_user_id: string // custom ID of owner
    created_at: string
    updated_at: string
}

export interface TeamMember {
    id: string
    team_id: string
    user_id: string // auth user id of member
    role: 'owner' | 'member'
    allowed_routes: string[] | null // null = all access, array = specific routes
    created_at: string
}

export interface UserProfile {
    id: string
    user_id: string
    custom_id: string
    display_name: string | null
    created_at: string
    updated_at: string
}

// Extended types with relations
export interface ProductWithStock extends Product {
    stock: Stock | null
}

export interface StockMovementWithProduct extends StockMovement {
    product: Product
}

export interface LowStockProduct {
    product_id: string
    product_name: string
    category: string
    unit: string
    current_quantity: number
    min_stock_level: number
}

export interface ExpiringProduct {
    product_id: string
    product_name: string
    batch_id: string
    quantity: number
    expiry_date: string
    days_until_expiry: number
}

export interface StockSummary {
    total_products: number
    low_stock_count: number
    expiring_soon_count: number
    total_movements_today: number
}

// Form types
export interface ProductFormData {
    name: string
    category: string
    unit: string
    min_stock_level: number
    expiry_tracking: boolean
    notes?: string
}

export interface StockMovementFormData {
    product_id: string
    type: MovementType
    quantity: number
    reason?: string
    expiry_date?: string
    notes?: string
}
