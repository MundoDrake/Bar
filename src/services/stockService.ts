// src/services/stockService.ts
import { apiFetch } from '../lib/api';
import type { StockMovementFormData, StockMovement, LowStockProduct, StockSummary } from '../types/database';

export const stockServices = {
    // Register a new movement
    registerMovement: async (data: StockMovementFormData) => {
        return apiFetch<{ success: true }>('/stock/movement', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    // Get movement history
    getMovements: async () => {
        // We receive JSON that matches (StockMovement & { product: { name: string } })
        return apiFetch<(StockMovement & { product: { name: string } })[]>('/stock/movements');
    },

    // Get alerts and summary
    getAlerts: async () => {
        return apiFetch<{
            lowStock: LowStockProduct[];
            summary: StockSummary;
        }>('/stock/alerts');
    }
};
